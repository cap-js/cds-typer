using { autoexpose_test as my } from './schema.cds';

service MyService {
  entity Libraries as projection on my.Libraries;
}