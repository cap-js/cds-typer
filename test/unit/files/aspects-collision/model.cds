using { base.Books as BaseBooks } from './base';

/**
 * An aspect named 'Books' (plural) that extends 'base.Books'.
 * The singular of both is 'Book', causing a naming collision.
 * The aspect function must be named '_BooksAspect' (using entityName),
 * not '_BookAspect' (using inflection.singular).
 * Regression test for https://github.com/cap-js/cds-typer/issues/615
 */
aspect Books : BaseBooks {}

entity E : Books {}
