import {
  decoratorsDts,
  decoratorsLegacyDts,
  domDts,
  // domIterableDts,
  // domAsyncIterableDts,
  es5Dts,
  // es6Dts,
  es2015CollectionDts,
  es2015CoreDts,
  es2015Dts,
  es2015GeneratorDts,
  es2015IterableDts,
  es2015PromiseDts,
  es2015ProxyDts,
  es2015ReflectDts,
  es2015SymbolDts,
  es2015SymbolWellknownDts,
  es2016ArrayIncludeDts,
  es2016Dts,
  // es2016FullDts,
  es2016IntlDts,
  es2017ArraybufferDts,
  es2017DateDts,
  es2017Dts,
  // es2017FullDts,
  es2017IntlDts,
  es2017ObjectDts,
  es2017SharedmemoryDts,
  es2017StringDts,
  es2017TypedarraysDts,
  es2018AsyncgeneratorDts,
  es2018AsynciterableDts,
  es2018Dts,
  // es2018FullDts,
  es2018IntlDts,
  es2018PromiseDts,
  es2018RegexpDts,
  es2019ArrayDts,
  // es2019Dts,
  // es2019FullDts,
  es2019IntlDts,
  es2019ObjectDts,
  es2019StringDts,
  es2019SymbolDts,
  es2020BigintDts,
  // es2020Dts,
  es2020DateDts,
  // es2020FullDts,
  es2020IntlDts,
  es2020NumberDts,
  es2020PromiseDts,
  es2020SharedmemoryDts,
  es2020StringDts,
  es2020SymbolWellknownDts,
  // es2021Dts,
  // es2021FullDts,
  es2021IntlDts,
  es2021PromiseDts,
  es2021StringDts,
  es2021WeakrefDts,
  // es2022ArrayDts,
  // es2022Dts,
  es2022ErrorDts,
  // es2022FullDts,
  es2022IntlDts,
  es2022ObjectDts,
  es2022RegexpDts,
  es2022StringDts,
  // es2023ArrayDts,
  // es2023CollectionDts,
  // es2023Dts,
  // es2023FullDts,
  es2023IntlDts,
  // es2024ArraybufferDts,
  // es2024CollectionDts,
  // es2024Dts,
  // es2024FullDts,
  es2024ObjectDts,
  es2024PromiseDts,
  es2024RegexpDts,
  es2024SharedmemoryDts,
  es2024StringDts,
  // esNextArrayDts,
  // esNextCollectionDts,
  // esNextDts,
  esNextDecoratorsDts,
  esNextDisposableDts,
  esNextFloat16Dts,
  // esNextFullDts,
  esNextIntlDts,
  esNextIteratorDts,
  esNextPromiseDts,
  libDts,
  scriptHostDts,
  // webWorkerDts,
  // webWorkerAsyncIterableDts,
  webWorkerImportScriptsDts,
  // webWorkerIterableDts,
} from "../package-types/typescript-libs";

/**
 * Add the typescript lib definitions to the fsMap
 * @NOTE - Mutates the fsMap input
 */
export function addTypescriptLibs(fsMap: Map<string, string>) {
  // Core library definitions
  fsMap.set("/lib.d.ts", libDts);
  fsMap.set("/lib.decorators.d.ts", decoratorsDts);
  fsMap.set("/lib.decorators.legacy.d.ts", decoratorsLegacyDts);
  fsMap.set("/lib.scripthost.d.ts", scriptHostDts);

  // DOM-related definitions
  fsMap.set("/lib.dom.d.ts", domDts);
  //fsMap.set("/lib.dom.iterable.d.ts", domIterableDts);
  //fsMap.set("/lib.dom.asynciterable.d.ts", domAsyncIterableDts);

  // ES5/ES6 definitions
  fsMap.set("/lib.es5.d.ts", es5Dts);
  //fsMap.set("/lib.es6.d.ts", es6Dts);

  // ES2015 definitions
  fsMap.set("/lib.es2015.collection.d.ts", es2015CollectionDts);
  fsMap.set("/lib.es2015.core.d.ts", es2015CoreDts);
  fsMap.set("/lib.es2015.d.ts", es2015Dts);
  fsMap.set("/lib.es2015.generator.d.ts", es2015GeneratorDts);
  fsMap.set("/lib.es2015.iterable.d.ts", es2015IterableDts);
  fsMap.set("/lib.es2015.promise.d.ts", es2015PromiseDts);
  fsMap.set("/lib.es2015.proxy.d.ts", es2015ProxyDts);
  fsMap.set("/lib.es2015.reflect.d.ts", es2015ReflectDts);
  fsMap.set("/lib.es2015.symbol.d.ts", es2015SymbolDts);
  fsMap.set("/lib.es2015.symbol.wellknown.d.ts", es2015SymbolWellknownDts);

  // ES2016 definitions
  fsMap.set("/lib.es2016.array.include.d.ts", es2016ArrayIncludeDts);
  fsMap.set("/lib.es2016.d.ts", es2016Dts);
  //fsMap.set("/lib.es2016.full.d.ts", es2016FullDts);
  fsMap.set("/lib.es2016.intl.d.ts", es2016IntlDts);

  // ES2017 definitions
  fsMap.set("/lib.es2017.arraybuffer.d.ts", es2017ArraybufferDts);
  fsMap.set("/lib.es2017.d.ts", es2017Dts);
  fsMap.set("/lib.es2017.date.d.ts", es2017DateDts);
  //fsMap.set("/lib.es2017.full.d.ts", es2017FullDts);
  fsMap.set("/lib.es2017.intl.d.ts", es2017IntlDts);
  fsMap.set("/lib.es2017.object.d.ts", es2017ObjectDts);
  fsMap.set("/lib.es2017.sharedmemory.d.ts", es2017SharedmemoryDts);
  fsMap.set("/lib.es2017.string.d.ts", es2017StringDts);
  fsMap.set("/lib.es2017.typedarrays.d.ts", es2017TypedarraysDts);

  // ES2018 definitions
  fsMap.set("/lib.es2018.asyncgenerator.d.ts", es2018AsyncgeneratorDts);
  fsMap.set("/lib.es2018.asynciterable.d.ts", es2018AsynciterableDts);
  fsMap.set("/lib.es2018.d.ts", es2018Dts);
  //fsMap.set("/lib.es2018.full.d.ts", es2018FullDts);
  fsMap.set("/lib.es2018.intl.d.ts", es2018IntlDts);
  fsMap.set("/lib.es2018.promise.d.ts", es2018PromiseDts);
  fsMap.set("/lib.es2018.regexp.d.ts", es2018RegexpDts);

  // ES2019 definitions
  fsMap.set("/lib.es2019.array.d.ts", es2019ArrayDts);
  //fsMap.set("/lib.es2019.d.ts", es2019Dts);
  //fsMap.set("/lib.es2019.full.d.ts", es2019FullDts);
  fsMap.set("/lib.es2019.intl.d.ts", es2019IntlDts);
  fsMap.set("/lib.es2019.object.d.ts", es2019ObjectDts);
  fsMap.set("/lib.es2019.string.d.ts", es2019StringDts);
  fsMap.set("/lib.es2019.symbol.d.ts", es2019SymbolDts);

  // ES2020 definitions
  fsMap.set("/lib.es2020.bigint.d.ts", es2020BigintDts);
  //fsMap.set("/lib.es2020.d.ts", es2020Dts);
  fsMap.set("/lib.es2020.date.d.ts", es2020DateDts);
  //fsMap.set("/lib.es2020.full.d.ts", es2020FullDts);
  fsMap.set("/lib.es2020.intl.d.ts", es2020IntlDts);
  fsMap.set("/lib.es2020.number.d.ts", es2020NumberDts);
  fsMap.set("/lib.es2020.promise.d.ts", es2020PromiseDts);
  fsMap.set("/lib.es2020.sharedmemory.d.ts", es2020SharedmemoryDts);
  fsMap.set("/lib.es2020.string.d.ts", es2020StringDts);
  fsMap.set("/lib.es2020.symbol.wellknown.d.ts", es2020SymbolWellknownDts);

  // ES2021 definitions
  //fsMap.set("/lib.es2021.d.ts", es2021Dts);
  //fsMap.set("/lib.es2021.full.d.ts", es2021FullDts);
  fsMap.set("/lib.es2021.intl.d.ts", es2021IntlDts);
  fsMap.set("/lib.es2021.promise.d.ts", es2021PromiseDts);
  fsMap.set("/lib.es2021.string.d.ts", es2021StringDts);
  fsMap.set("/lib.es2021.weakref.d.ts", es2021WeakrefDts);

  // ES2022 definitions
  //fsMap.set("/lib.es2022.array.d.ts", es2022ArrayDts);
  //fsMap.set("/lib.es2022.d.ts", es2022Dts);
  fsMap.set("/lib.es2022.error.d.ts", es2022ErrorDts);
  //fsMap.set("/lib.es2022.full.d.ts", es2022FullDts);
  fsMap.set("/lib.es2022.intl.d.ts", es2022IntlDts);
  fsMap.set("/lib.es2022.object.d.ts", es2022ObjectDts);
  fsMap.set("/lib.es2022.regexp.d.ts", es2022RegexpDts);
  fsMap.set("/lib.es2022.string.d.ts", es2022StringDts);

  // ES2023 definitions
  //fsMap.set("/lib.es2023.array.d.ts", es2023ArrayDts);
  //fsMap.set("/lib.es2023.collection.d.ts", es2023CollectionDts);
  //fsMap.set("/lib.es2023.d.ts", es2023Dts);
  //fsMap.set("/lib.es2023.full.d.ts", es2023FullDts);
  fsMap.set("/lib.es2023.intl.d.ts", es2023IntlDts);

  // ES2024 definitions
  //fsMap.set("/lib.es2024.arraybuffer.d.ts", es2024ArraybufferDts);
  //fsMap.set("/lib.es2024.collection.d.ts", es2024CollectionDts);
  //fsMap.set("/lib.es2024.d.ts", es2024Dts);
  //fsMap.set("/lib.es2024.full.d.ts", es2024FullDts);
  fsMap.set("/lib.es2024.object.d.ts", es2024ObjectDts);
  fsMap.set("/lib.es2024.promise.d.ts", es2024PromiseDts);
  fsMap.set("/lib.es2024.regexp.d.ts", es2024RegexpDts);
  fsMap.set("/lib.es2024.sharedmemory.d.ts", es2024SharedmemoryDts);
  fsMap.set("/lib.es2024.string.d.ts", es2024StringDts);

  // ESNext definitions
  //fsMap.set("/lib.esnext.array.d.ts", esNextArrayDts);
  //fsMap.set("/lib.esnext.collection.d.ts", esNextCollectionDts);
  //fsMap.set("/lib.esnext.d.ts", esNextDts);
  fsMap.set("/lib.esnext.decorators.d.ts", esNextDecoratorsDts);
  fsMap.set("/lib.esnext.disposable.d.ts", esNextDisposableDts);
  fsMap.set("/lib.esnext.float16.d.ts", esNextFloat16Dts);
  //fsMap.set("/lib.esnext.full.d.ts", esNextFullDts);
  fsMap.set("/lib.esnext.intl.d.ts", esNextIntlDts);
  fsMap.set("/lib.esnext.iterator.d.ts", esNextIteratorDts);
  fsMap.set("/lib.esnext.promise.d.ts", esNextPromiseDts);

  // Web worker related definitions
  //fsMap.set("/lib.webworker.d.ts", webWorkerDts);
  //fsMap.set("/lib.webworker.asynciterable.d.ts", webWorkerAsyncIterableDts);
  fsMap.set("/lib.webworker.importscripts.d.ts", webWorkerImportScriptsDts);
  //fsMap.set("/lib.webworker.iterable.d.ts", webWorkerIterableDts);
}
