import type { csn, linked } from '@sap/cds'
import type { resolver, traverser } from '../../lib/typedefs'

// Regression for #368: compileFromFile supplies linked models, whose definitions
// do not necessarily have a type (services, contexts, entities, inline structs).
declare const linkedModel: linked.LinkedCSN
const model: resolver.CSN = linkedModel
const definition: resolver.EntityCSN = linkedModel.definitions['Example']
const namespace: csn.CSN['namespace'] = model.namespace
const sources: csn.CSN['$sources'] = model.$sources
const doc: string | undefined = definition.doc
void [namespace, sources, doc]

const entity: resolver.EntityCSN = {
    name: 'Example',
    kind: 'entity',
    elements: {
        ID: { name: 'ID', type: 'cds.Integer', key: true, notNull: true },
        address: {
            name: 'address',
            elements: { street: { name: 'street', type: 'cds.String' } }
        },
        tags: { name: 'tags', items: { name: 'tag', type: 'cds.String' } },
        status: {
            name: 'status',
            type: 'cds.String',
            enum: { active: { val: 'A' }, inactive: {} },
            resolvedType: 'cds.String',
            _targetEntity: 'Example',
            isRefNotNull: true
        },
        related: {
            name: 'related', type: 'cds.Association', target: 'Example',
            cardinality: { max: 3 },
            on: [{ ref: ['related', 'ID'] }, '=', { ref: ['ID'] }]
        },
        reference: { name: 'reference', type: { ref: ['Example', 'ID'] } }
    },
    actions: { activate: { name: 'activate', kind: 'action' } },
    operations: { read: { name: 'read', kind: 'function', returns: { name: 'result', type: 'cds.String' } } },
    compositions: { child: { name: 'child', target: 'Child' } },
    keys: { ID: { name: 'ID', type: 'cds.Integer', _unresolved: false } }
}
void entity

const operation: traverser.EventPayload['operation'] = {
    name: 'activate', kind: 'action',
    params: { ID: { name: 'ID', kind: 'param', type: 'cds.Integer', '@mandatory': true } }
}
const projection: resolver.ProjectionCSN = {
    name: 'Projected', kind: 'entity',
    projection: { from: { ref: ['Example'] }, columns: ['*', { ref: ['ID'], as: 'id' }] }
}
const view: resolver.ViewCSN = {
    name: 'View', kind: 'entity', query: { SELECT: { from: { ref: ['Example'] } } }
}
const enumType: resolver.EnumCSN = {
    name: 'Flag', type: 'cds.Boolean', enum: { yes: { val: true }, no: { val: false } }
}
void [operation, projection, view, enumType]

// The adapter must retain real checking, including on recursive properties.
// @ts-expect-error CSN actions are dictionaries, not arrays.
entity.actions = [operation]
// @ts-expect-error CSN enum values are wrapped, not bare strings.
enumType.enum.yes = 'Y'
// @ts-expect-error Typer's metadata remains typed on nested elements.
entity.elements!.status._targetEntity = 42
// @ts-expect-error Definition kinds are derived from cds-types, not arbitrary strings.
entity.kind = 'invented'
// @ts-expect-error Do not leak typer metadata into shared types through augmentation.
linkedModel.definitions['Example']._targetEntity = 'Other'
