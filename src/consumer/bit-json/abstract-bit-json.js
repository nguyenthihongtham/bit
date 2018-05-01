/** @flow */
import path from 'path';
import R from 'ramda';
import fs from 'fs-extra';
import { BitIds, BitId } from '../../bit-id';
import { filterObject } from '../../utils';
import type { ExtensionOptions } from '../../extensions/extension';
import CompilerExtension, { CompilerEnvType } from '../../extensions/compiler-extension';
import TesterExtension, { TesterEnvType } from '../../extensions/tester-extension';
import type { EnvExtensionOptions, EnvType } from '../../extensions/env-extension';
import type { PathOsBased } from '../../utils/path';
import { BitJsonAlreadyExists } from './exceptions';
import {
  BIT_JSON,
  DEFAULT_IMPL_NAME,
  DEFAULT_SPECS_NAME,
  DEFAULT_DEPENDENCIES,
  NO_PLUGIN_TYPE,
  DEFAULT_LANGUAGE,
  DEFAULT_BINDINGS_PREFIX,
  DEFAULT_EXTENSIONS
} from '../../constants';

export type RegularExtensionObject = {
  rawConfig: Object,
  options: ExtensionOptions
};

export type EnvExtensionObject = {
  rawConfig: Object,
  options: EnvExtensionOptions,
  files: string[]
};

export type TesterExtensionObject = EnvExtensionObject;

export type CompilerExtensionObject = EnvExtensionObject;

export type Extensions = { [extensionName: string]: RegularExtensionObject };
export type Envs = { [envName: string]: CompilerExtensionObject };
export type Compilers = { [compilerName: string]: CompilerExtensionObject };
export type Testers = { [testerName: string]: TesterExtensionObject };

export type AbstractBitJsonProps = {
  impl?: string,
  spec?: string,
  compiler?: string | Compilers,
  tester?: string | Testers,
  dependencies?: Object,
  devDependencies?: Object,
  lang?: string,
  bindingPrefix?: string,
  extensions?: Extensions
};

export default class AbstractBitJson {
  /** @deprecated * */
  impl: string;
  /** @deprecated * */
  spec: string;
  path: string;
  _compiler: Compilers;
  _tester: Testers;
  dependencies: { [string]: string };
  devDependencies: { [string]: string };
  lang: string;
  bindingPrefix: string;
  extensions: Extensions;

  constructor({
    impl,
    spec,
    compiler,
    tester,
    dependencies,
    devDependencies,
    lang,
    bindingPrefix,
    extensions
  }: AbstractBitJsonProps) {
    this.impl = impl || DEFAULT_IMPL_NAME;
    this.spec = spec || DEFAULT_SPECS_NAME;
    this._compiler = compiler || {};
    this._tester = tester || {};
    this.dependencies = dependencies || DEFAULT_DEPENDENCIES;
    this.devDependencies = devDependencies || DEFAULT_DEPENDENCIES;
    this.lang = lang || DEFAULT_LANGUAGE;
    this.bindingPrefix = bindingPrefix || DEFAULT_BINDINGS_PREFIX;
    this.extensions = extensions || DEFAULT_EXTENSIONS;
  }

  get compiler(): ?Compilers {
    const compilerObj = transformEnvToObject(this._compiler);
    if (R.isEmpty(compilerObj)) return undefined;
    return compilerObj;
  }

  set compiler(compiler: string | Compilers) {
    this._compiler = transformEnvToObject(compiler);
  }

  get tester(): ?Testers {
    const testerObj = transformEnvToObject(this._tester);
    if (R.isEmpty(testerObj)) return undefined;
    return testerObj;
  }

  set tester(tester: string | testers) {
    this._tester = transformEnvToObject(tester);
  }

  addDependencies(bitIds: BitId[]): this {
    const idObjects = R.mergeAll(bitIds.map(bitId => bitId.toObject()));
    this.dependencies = R.merge(this.dependencies, idObjects);
    return this;
  }

  addDependency(bitId: BitId): this {
    this.dependencies = R.merge(this.dependencies, bitId.toObject());
    return this;
  }

  getImplBasename(): string {
    return this.impl;
  }

  setImplBasename(name: string) {
    this.impl = name;
    return this;
  }

  getSpecBasename(): string {
    return this.spec;
  }

  setSpecBasename(name: string) {
    this.spec = name;
    return this;
  }

  hasCompiler(): boolean {
    return !!this.compiler && this._compiler !== NO_PLUGIN_TYPE && !R.isEmpty(this.compiler);
  }

  hasTester(): boolean {
    return !!this.tester && this._tester !== NO_PLUGIN_TYPE && !R.isEmpty(this.tester);
  }

  getEnvsByType(type: EnvType): Envs {
    if (type === CompilerEnvType) {
      return this.compiler;
    }
    return this.tester;
  }

  async loadCompiler(consumerPath: string, scopePath: string, context?: Object): Promise<?CompilerExtension> {
    if (!this.hasCompiler()) {
      return null;
    }
    const compiler: CompilerExtension = await this.loadEnv(
      CompilerEnvType,
      consumerPath,
      scopePath,
      CompilerExtension.load,
      context
    );
    return compiler;
  }

  async loadTester(consumerPath: string, scopePath: string, context?: Object): Promise<?TesterExtension> {
    if (!this.hasTester()) {
      return null;
    }
    const tester: TesterExtension = await this.loadEnv(
      TesterEnvType,
      consumerPath,
      scopePath,
      TesterExtension.load,
      context
    );
    return tester;
  }

  async loadEnv(
    envType: EnvType,
    consumerPath: string,
    scopePath: string,
    loadFunc: Function,
    context?: Object
  ): Promise<?CompilerExtension | ?TesterExtension> {
    const envs = this.getEnvsByType(envType);
    // TODO: Gilad - support more than one key of compiler
    const envName = Object.keys(envs)[0];
    const envObject = envs[envName];
    const envProps = getEnvsProps(consumerPath, scopePath, envName, envObject, this.path, context);
    const env = await loadFunc(envProps);
    return env;
  }

  getDependencies(): BitIds {
    return BitIds.fromObject(this.dependencies);
  }

  toPlainObject(): Object {
    const isPropDefaultOrNull = (val, key) => {
      if (!val) return false;
      if (key === 'lang') return val !== DEFAULT_LANGUAGE;
      if (key === 'bindingPrefix') return val !== DEFAULT_BINDINGS_PREFIX;
      if (key === 'extensions') return !R.equals(val, DEFAULT_EXTENSIONS);
      return true;
    };

    return filterObject(
      {
        lang: this.lang,
        bindingPrefix: this.bindingPrefix,
        env: {
          compiler: this.compiler,
          tester: this.tester
        },
        dependencies: this.dependencies,
        extensions: this.extensions
      },
      isPropDefaultOrNull
    );
  }

  async write({ bitDir, override = true }: { bitDir: string, override?: boolean }): Promise<boolean> {
    const isExisting = await AbstractBitJson.hasExisting(bitDir);
    if (!override && isExisting) {
      throw new BitJsonAlreadyExists();
    }

    return fs.writeFile(AbstractBitJson.composePath(bitDir), this.toJson());
  }

  toJson(readable: boolean = true) {
    if (!readable) return JSON.stringify(this.toPlainObject());
    return JSON.stringify(this.toPlainObject(), null, 4);
  }

  static composePath(bitPath: PathOsBased): PathOsBased {
    return path.join(bitPath, BIT_JSON);
  }

  static async hasExisting(bitPath: string): Promise<boolean> {
    return fs.exists(this.composePath(bitPath));
  }
}

const transformEnvToObject = (env): Envs => {
  if (typeof env === 'string') {
    return {
      [env]: {
        rawConfig: {},
        options: {}
      }
    };
  }
  return env;
};

const getEnvsProps = (
  consumerPath: string,
  scopePath: string,
  envName: string,
  envObject: EnvExtensionObject,
  bitJsonPath: string,
  context?: Object
): EnvLoadArgsProps => {
  const envProps = {
    name: envName,
    consumerPath,
    scopePath,
    rawConfig: envObject.rawConfig,
    files: envObject.files,
    bitJsonPath,
    options: envObject.options,
    context
  };
  return envProps;
};
