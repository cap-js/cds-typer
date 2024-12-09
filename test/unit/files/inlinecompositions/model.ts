import cds from '@sap/cds'
import * as CatSrv from '#cds-models/inl_comp/CatService'
import { Genre, Books,  Bestsellers } from '#cds-models/inl_comp'

export class InlineCompService extends cds.ApplicationService {
    override async init() {
        // Checks on model entities
        const office: Books.publishers.office = {
            zipCode: '4934',
            up__ID: '',
            up__up__ID: '',
            up_: {
                name: '',
            },
            size: Books.publishers.office.size.large,
        }
        const intEditor: Books.publishers.PEditor = { name: 'editor 1' }
        const extEditors: Books.publishers.EEditors = [{ name: 'editor 2' }]
        const publisher: Books.publisher = {
            ID: '134',
            name: 'Publisher1',
            intEditors: [{name: 'Int. Editor 1'}, {name: 'Int. Editor 2'}],
            extEditors: [{name: 'Ext. Editor 1'}],
            offices: [{
                city: 'A',
                zipCode: '4934',
                size: Books.publishers.office.size.large
            }]
        }
        const bestseller: Bestsellers = [{ genre_code: Genre.code.Fiction }]

        // Checks on Service entities
        const book: CatSrv.Book = { 
            ID: '493493',
            title: 'Book 1',
            genre_code: CatSrv.Genre.code.Fiction,
            publishers: [{
                ID: '134',
                name: 'Publisher1',
                intEditors: [{name: 'Int. Editor 1'}, {name: 'Int. Editor 2'}],
                extEditors: [{name: 'Ext. Editor 1'}],
                offices: [{
                    city: 'A',
                    zipCode: '4934',
                    size: Books.publishers.office.size.large
                }]
            }]
        }
        return super.init()
    }
}
