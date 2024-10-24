import cds from '@sap/cds'
import {DraftEntity} from '#cds-models/_'
import {Books, Publishers} from '#cds-models/bookshop/service/CatalogService'

export class CatalogService extends cds.ApplicationService {
    async init() {

        this.after("READ", Publishers.drafts, publishers => {
            if (!publishers?.length) return
            publishers.forEach(p => {
                p.name
                p.HasActiveEntity
                p.HasDraftEntity
                p.IsActiveEntity
                p.DraftAdministrativeData_DraftUUID
            })
        })

        this.after("READ", Books.drafts, books => {
            if (!books?.length) return
            books.forEach(b => {
                b.title
                b.HasActiveEntity
                b.HasDraftEntity
                b.IsActiveEntity
                b.DraftAdministrativeData_DraftUUID
            })
        })
        return super.init()
    }
}