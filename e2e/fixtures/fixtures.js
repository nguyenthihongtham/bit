export const isType = "module.exports = function isType() { return 'got is-type'; };";
export const isTypeV2 = "module.exports = function isType() { return 'got is-type v2'; };";
export const isTypeV3 = "module.exports = function isType() { return 'got is-type v3'; };";
export const isTypeSpec = testShouldPass => `const expect = require('chai').expect;
const isType = require('./is-type.js');

describe('isType', () => {
  it('should display "got is-type"', () => {
    expect(isType())${testShouldPass ? '' : '.not'}.to.equal('got is-type');
  });
});`;
export const isTypeES6 = "export default function isType() { return 'got is-type'; };";
export const isString =
  "const isType = require('./is-type.js'); module.exports = function isString() { return isType() +  ' and got is-string'; };";
export const isStringV2 =
  "const isType = require('./is-type.js'); module.exports = function isString() { return isType() +  ' and got is-string v2'; };";
export const isStringSpec = testShouldPass => `const expect = require('chai').expect;
const isString = require('./is-string.js');

describe('isString', () => {
  it('should display "got is-type and got is-string"', () => {
    expect(isString())${testShouldPass ? '' : '.not'}.to.equal('got is-type and got is-string');
  });
});`;
export const isStringES6 =
  "import isType from './is-type.js'; export default function isString() { return isType() +  ' and got is-string'; };";
export const barFooFixture =
  "const isString = require('../utils/is-string.js'); module.exports = function foo() { return isString() + ' and got foo'; };";
export const barFooFixtureV2 =
  "const isString = require('../utils/is-string.js'); module.exports = function foo() { return isString() + ' and got foo v2'; };";
export const barFooES6 =
  "import isString from '../utils/is-string.js'; export default function foo() { return isString() + ' and got foo'; };";
export const barFooSpecES6 = testShouldPass => `const expect = require('chai').expect;
const foo = require('./foo.js');

describe('foo', () => {
  it('should display "got is-type and got is-string and got foo"', () => {
    expect(foo())${testShouldPass ? '' : '.not'}.to.equal('got is-type and got is-string and got foo');
  });
});`;
export const appPrintBarFoo = "const barFoo = require('./components/bar/foo'); console.log(barFoo());";
export const appPrintBarFooAuthor = "const barFoo = require('./bar/foo'); console.log(barFoo());";
