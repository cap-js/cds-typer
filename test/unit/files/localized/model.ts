import cds from '@sap/cds'
import { Books } from '#cds-models/localized_model'

const bookText: Books.text = {
    title: 'Book A',
    locale: 'de'
}

const book: Books = [{
    title: 'Book A',
    authorName: 'John',
    localized: {
        title: 'Book A - default',
    },
    texts: [
        { title: 'Book A - english', locale: 'en' },
        { title: 'Book A - deutsch', locale: 'de' },
    ],
}]
