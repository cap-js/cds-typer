import cds from '@sap/cds'

import { free, free2, free3, free4, freetypeof, freevoid } from '#cds-models/actions_test'
import {
    aDocMoreLinesWithBadChar,
    aDocOneLine,
    aManyParamManyReturn,
    aManyParamSingleReturn,
    aMandatoryParam,
    aRfcStyle,
    aSingleParamManyReturn,
    aSingleParamSingleReturn,
    E,
    fManyParamManyReturn,
    fManyParamSingleReturn,
    fSingleParamManyReturn,
    fSingleParamSingleReturn,
    getManyExternalTypes,
    getOneExternalType,
} from '#cds-models/actions_test/S'

import S2 from '#cds-models/actions_test/S2'

import S_ from '#cds-models/actions_test/S'

import { ExternalType, ExternalType2 } from '#cds-models/elsewhere'
import { ExternalInRoot } from '#cds-models';

// see https://dev.to/hesxenon/how-to-correctly-check-if-properties-are-optional-3453
type IsKeyOptional<T extends Record<string | number | symbol, unknown>, Keys extends keyof T> =
    {[Key in Keys]?: T[Key]} extends Pick<T, Keys> ? true : false;

export class S extends cds.ApplicationService { override async init(){

  const s_  = await cds.connect.to(S_)

  this.on(getOneExternalType,        req => { return {extType:1} satisfies ExternalType})
  this.on(getManyExternalTypes,      req => { return [{extType:1}] satisfies ExternalType[] })
  this.on(fSingleParamSingleReturn,  req => { const {val} = req.data; return {e1:val?.e1} satisfies E })
  this.on(fSingleParamManyReturn,    req => { const {val} = req.data; return [{e1:val?.e1}] satisfies E[] })
  this.on(fManyParamManyReturn,      req => { const {val} = req.data; return val! satisfies E[] })
  this.on(fManyParamSingleReturn,    req => { const {val} = req.data; return {e1:val?.at(0)?.e1} satisfies E })

  this.on(aSingleParamSingleReturn,  req => { const {val} = req.data; return {e1:val?.e1} satisfies E })
  this.on(aSingleParamManyReturn,    req => { const {val} = req.data; return [{e1:val?.e1}] satisfies E[] })
  this.on(aManyParamManyReturn,      req => { const {val} = req.data; return val! satisfies E[] })
  this.on(aManyParamSingleReturn,    req => { const {val} = req.data; return {e1:val?.at(0)?.e1} satisfies E })

  this.on(aMandatoryParam,  req => {
    false satisfies IsKeyOptional<typeof req.data, 'val1'>
    false satisfies IsKeyOptional<typeof req.data, 'val2'>
    true satisfies IsKeyOptional<typeof req.data, 'opt'>
  })

  this.on(free,       req => { const { param } = req.data; return { a:1, b:param } })
  this.on(free, async req => { const { param } = req.data; return Promise.resolve({ a:1, b:param }) })
  this.on(free2,      req => { return {extType:1} satisfies ExternalType })
  this.on(free3,      req => { return {extRoot:1} satisfies ExternalInRoot})
  this.on(freevoid,   req => { return undefined satisfies void })
  this.on(freetypeof, req => { req.data.p! satisfies number })
  this.on(free4,      req => { return { extType2:1 } satisfies ExternalType2 })

  // calling actions
  const s2 = await cds.connect.to(S2)
  await s2.a1({p1: '', p2: [ { extType2: 1 } ]}) satisfies ExternalType | null
  await s2.a1('', [ { extType2: 1 } ]) satisfies ExternalType | null
  await s2.a2({p1: '', p3: 1}) satisfies ExternalType | null
  await s2.a2('', [], 1) satisfies ExternalType | null

  await s_.aRfcStyle({INPUT: ''}) satisfies ExternalType | null
  //@ts-expect-error
  await s_.aRfcStyle('') // no positional call style allowed for RFC actions

  // docs -> hover over actions
  // provider side
  this.on(aDocOneLine,    req => { const {val1, val2} = req.data; return {e1:val1?.e1} satisfies E  | null})
  // caller side
  s_.aDocOneLine({val1: {}, val2: {}})
  // provider side
  this.on(aDocMoreLinesWithBadChar, req => { const {val} = req.data; return {e1:val?.e1} satisfies E | null})
  // caller side
  s_.aDocMoreLinesWithBadChar({val: {}})


  return super.init()
}}
