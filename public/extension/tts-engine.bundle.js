var AdhdReaderTts = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // node_modules/espeak-ng/dist/espeak-ng.js
  var espeak_ng_exports = {};
  __export(espeak_ng_exports, {
    default: () => espeak_ng_default2
  });
  var import_meta3, ESpeakNG, espeak_ng_default2;
  var init_espeak_ng = __esm({
    "node_modules/espeak-ng/dist/espeak-ng.js"() {
      import_meta3 = {};
      ESpeakNG = (() => {
        var _scriptDir = import_meta3.url;
        return (async function(moduleArg = {}) {
          var Module2 = moduleArg;
          var readyPromiseResolve, readyPromiseReject;
          Module2["ready"] = new Promise((resolve, reject) => {
            readyPromiseResolve = resolve;
            readyPromiseReject = reject;
          });
          ["_main", "_memory", "_fflush", "___indirect_function_table", "___emscripten_embedded_file_data", "onRuntimeInitialized"].forEach((prop) => {
            if (!Object.getOwnPropertyDescriptor(Module2["ready"], prop)) {
              Object.defineProperty(Module2["ready"], prop, {
                get: () => abort("You are getting " + prop + " on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js"),
                set: () => abort("You are setting " + prop + " on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js")
              });
            }
          });
          var moduleOverrides = Object.assign({}, Module2);
          var arguments_ = [];
          var thisProgram = "./this.program";
          var quit_ = (status, toThrow) => {
            throw toThrow;
          };
          var ENVIRONMENT_IS_WEB = typeof window == "object";
          var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";
          var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";
          var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
          if (Module2["ENVIRONMENT"]) {
            throw new Error("Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)");
          }
          var scriptDirectory = "";
          function locateFile(path) {
            if (Module2["locateFile"]) {
              return Module2["locateFile"](path, scriptDirectory);
            }
            return scriptDirectory + path;
          }
          var read_, readAsync, readBinary;
          if (ENVIRONMENT_IS_NODE) {
            if (typeof process == "undefined" || !process.release || process.release.name !== "node") throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
            var nodeVersion = process.versions.node;
            var numericVersion = nodeVersion.split(".").slice(0, 3);
            numericVersion = numericVersion[0] * 1e4 + numericVersion[1] * 100 + numericVersion[2].split("-")[0] * 1;
            var minVersion = 16e4;
            if (numericVersion < 16e4) {
              throw new Error("This emscripten-generated code requires node v16.0.0 (detected v" + nodeVersion + ")");
            }
            const { createRequire } = await import("module");
            var require2 = createRequire(import_meta3.url);
            var fs = require2("fs");
            var nodePath = require2("path");
            if (ENVIRONMENT_IS_WORKER) {
              scriptDirectory = nodePath.dirname(scriptDirectory) + "/";
            } else {
              scriptDirectory = require2("url").fileURLToPath(new URL("./", import_meta3.url));
            }
            read_ = (filename, binary) => {
              filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
              return fs.readFileSync(filename, binary ? void 0 : "utf8");
            };
            readBinary = (filename) => {
              var ret = read_(filename, true);
              if (!ret.buffer) {
                ret = new Uint8Array(ret);
              }
              assert(ret.buffer);
              return ret;
            };
            readAsync = (filename, onload, onerror, binary = true) => {
              filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
              fs.readFile(filename, binary ? void 0 : "utf8", (err2, data) => {
                if (err2) onerror(err2);
                else onload(binary ? data.buffer : data);
              });
            };
            if (!Module2["thisProgram"] && process.argv.length > 1) {
              thisProgram = process.argv[1].replace(/\\/g, "/");
            }
            arguments_ = process.argv.slice(2);
            quit_ = (status, toThrow) => {
              process.exitCode = status;
              throw toThrow;
            };
            Module2["inspect"] = () => "[Emscripten Module object]";
          } else if (ENVIRONMENT_IS_SHELL) {
            if (typeof process == "object" && typeof require2 === "function" || typeof window == "object" || typeof importScripts == "function") throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
            if (typeof read != "undefined") {
              read_ = read;
            }
            readBinary = (f) => {
              if (typeof readbuffer == "function") {
                return new Uint8Array(readbuffer(f));
              }
              let data = read(f, "binary");
              assert(typeof data == "object");
              return data;
            };
            readAsync = (f, onload, onerror) => {
              setTimeout(() => onload(readBinary(f)));
            };
            if (typeof clearTimeout == "undefined") {
              globalThis.clearTimeout = (id) => {
              };
            }
            if (typeof setTimeout == "undefined") {
              globalThis.setTimeout = (f) => typeof f == "function" ? f() : abort();
            }
            if (typeof scriptArgs != "undefined") {
              arguments_ = scriptArgs;
            } else if (typeof arguments != "undefined") {
              arguments_ = arguments;
            }
            if (typeof quit == "function") {
              quit_ = (status, toThrow) => {
                setTimeout(() => {
                  if (!(toThrow instanceof ExitStatus)) {
                    let toLog = toThrow;
                    if (toThrow && typeof toThrow == "object" && toThrow.stack) {
                      toLog = [toThrow, toThrow.stack];
                    }
                    err(`exiting due to exception: ${toLog}`);
                  }
                  quit(status);
                });
                throw toThrow;
              };
            }
            if (typeof print != "undefined") {
              if (typeof console == "undefined") console = /** @type{!Console} */
              {};
              console.log = /** @type{!function(this:Console, ...*): undefined} */
              print;
              console.warn = console.error = /** @type{!function(this:Console, ...*): undefined} */
              typeof printErr != "undefined" ? printErr : print;
            }
          } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
            if (ENVIRONMENT_IS_WORKER) {
              scriptDirectory = self.location.href;
            } else if (typeof document != "undefined" && document.currentScript) {
              scriptDirectory = document.currentScript.src;
            }
            if (_scriptDir) {
              scriptDirectory = _scriptDir;
            }
            if (scriptDirectory.indexOf("blob:") !== 0) {
              scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
            } else {
              scriptDirectory = "";
            }
            if (!(typeof window == "object" || typeof importScripts == "function")) throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
            {
              read_ = (url) => {
                var xhr = new XMLHttpRequest();
                xhr.open("GET", url, false);
                xhr.send(null);
                return xhr.responseText;
              };
              if (ENVIRONMENT_IS_WORKER) {
                readBinary = (url) => {
                  var xhr = new XMLHttpRequest();
                  xhr.open("GET", url, false);
                  xhr.responseType = "arraybuffer";
                  xhr.send(null);
                  return new Uint8Array(
                    /** @type{!ArrayBuffer} */
                    xhr.response
                  );
                };
              }
              readAsync = (url, onload, onerror) => {
                var xhr = new XMLHttpRequest();
                xhr.open("GET", url, true);
                xhr.responseType = "arraybuffer";
                xhr.onload = () => {
                  if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                    onload(xhr.response);
                    return;
                  }
                  onerror();
                };
                xhr.onerror = onerror;
                xhr.send(null);
              };
            }
          } else {
            throw new Error("environment detection error");
          }
          var out = Module2["print"] || console.log.bind(console);
          var err = Module2["printErr"] || console.error.bind(console);
          Object.assign(Module2, moduleOverrides);
          moduleOverrides = null;
          checkIncomingModuleAPI();
          if (Module2["arguments"]) arguments_ = Module2["arguments"];
          legacyModuleProp("arguments", "arguments_");
          if (Module2["thisProgram"]) thisProgram = Module2["thisProgram"];
          legacyModuleProp("thisProgram", "thisProgram");
          if (Module2["quit"]) quit_ = Module2["quit"];
          legacyModuleProp("quit", "quit_");
          assert(typeof Module2["memoryInitializerPrefixURL"] == "undefined", "Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead");
          assert(typeof Module2["pthreadMainPrefixURL"] == "undefined", "Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead");
          assert(typeof Module2["cdInitializerPrefixURL"] == "undefined", "Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead");
          assert(typeof Module2["filePackagePrefixURL"] == "undefined", "Module.filePackagePrefixURL option was removed, use Module.locateFile instead");
          assert(typeof Module2["read"] == "undefined", "Module.read option was removed (modify read_ in JS)");
          assert(typeof Module2["readAsync"] == "undefined", "Module.readAsync option was removed (modify readAsync in JS)");
          assert(typeof Module2["readBinary"] == "undefined", "Module.readBinary option was removed (modify readBinary in JS)");
          assert(typeof Module2["setWindowTitle"] == "undefined", "Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)");
          assert(typeof Module2["TOTAL_MEMORY"] == "undefined", "Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY");
          legacyModuleProp("asm", "wasmExports");
          legacyModuleProp("read", "read_");
          legacyModuleProp("readAsync", "readAsync");
          legacyModuleProp("readBinary", "readBinary");
          legacyModuleProp("setWindowTitle", "setWindowTitle");
          var IDBFS = "IDBFS is no longer included by default; build with -lidbfs.js";
          var PROXYFS = "PROXYFS is no longer included by default; build with -lproxyfs.js";
          var WORKERFS = "WORKERFS is no longer included by default; build with -lworkerfs.js";
          var FETCHFS = "FETCHFS is no longer included by default; build with -lfetchfs.js";
          var ICASEFS = "ICASEFS is no longer included by default; build with -licasefs.js";
          var JSFILEFS = "JSFILEFS is no longer included by default; build with -ljsfilefs.js";
          var OPFS = "OPFS is no longer included by default; build with -lopfs.js";
          var NODEFS = "NODEFS is no longer included by default; build with -lnodefs.js";
          assert(!ENVIRONMENT_IS_SHELL, "shell environment detected but not enabled at build time.  Add 'shell' to `-sENVIRONMENT` to enable.");
          var wasmBinary;
          if (Module2["wasmBinary"]) wasmBinary = Module2["wasmBinary"];
          legacyModuleProp("wasmBinary", "wasmBinary");
          if (typeof WebAssembly != "object") {
            abort("no native wasm support detected");
          }
          function intArrayFromBase64(s) {
            if (typeof ENVIRONMENT_IS_NODE != "undefined" && ENVIRONMENT_IS_NODE) {
              var buf = Buffer.from(s, "base64");
              return new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
            }
            var decoded = atob(s);
            var bytes = new Uint8Array(decoded.length);
            for (var i = 0; i < decoded.length; ++i) {
              bytes[i] = decoded.charCodeAt(i);
            }
            return bytes;
          }
          function tryParseAsDataURI(filename) {
            if (!isDataURI(filename)) {
              return;
            }
            return intArrayFromBase64(filename.slice(dataURIPrefix.length));
          }
          var wasmMemory;
          var ABORT = false;
          var EXITSTATUS;
          function assert(condition, text) {
            if (!condition) {
              abort("Assertion failed" + (text ? ": " + text : ""));
            }
          }
          var HEAP, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
          function updateMemoryViews() {
            var b = wasmMemory.buffer;
            Module2["HEAP8"] = HEAP8 = new Int8Array(b);
            Module2["HEAP16"] = HEAP16 = new Int16Array(b);
            Module2["HEAPU8"] = HEAPU8 = new Uint8Array(b);
            Module2["HEAPU16"] = HEAPU16 = new Uint16Array(b);
            Module2["HEAP32"] = HEAP32 = new Int32Array(b);
            Module2["HEAPU32"] = HEAPU32 = new Uint32Array(b);
            Module2["HEAPF32"] = HEAPF32 = new Float32Array(b);
            Module2["HEAPF64"] = HEAPF64 = new Float64Array(b);
          }
          assert(!Module2["STACK_SIZE"], "STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time");
          assert(
            typeof Int32Array != "undefined" && typeof Float64Array !== "undefined" && Int32Array.prototype.subarray != void 0 && Int32Array.prototype.set != void 0,
            "JS engine does not provide full typed array support"
          );
          assert(!Module2["wasmMemory"], "Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally");
          assert(!Module2["INITIAL_MEMORY"], "Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically");
          function writeStackCookie() {
            var max = _emscripten_stack_get_end();
            assert((max & 3) == 0);
            if (max == 0) {
              max += 4;
            }
            HEAPU32[max >> 2] = 34821223;
            HEAPU32[max + 4 >> 2] = 2310721022;
            HEAPU32[0 >> 2] = 1668509029;
          }
          function checkStackCookie() {
            if (ABORT) return;
            var max = _emscripten_stack_get_end();
            if (max == 0) {
              max += 4;
            }
            var cookie1 = HEAPU32[max >> 2];
            var cookie2 = HEAPU32[max + 4 >> 2];
            if (cookie1 != 34821223 || cookie2 != 2310721022) {
              abort(`Stack overflow! Stack cookie has been overwritten at ${ptrToString(max)}, expected hex dwords 0x89BACDFE and 0x2135467, but received ${ptrToString(cookie2)} ${ptrToString(cookie1)}`);
            }
            if (HEAPU32[0 >> 2] != 1668509029) {
              abort("Runtime error: The application has corrupted its heap memory area (address zero)!");
            }
          }
          (function() {
            var h16 = new Int16Array(1);
            var h8 = new Int8Array(h16.buffer);
            h16[0] = 25459;
            if (h8[0] !== 115 || h8[1] !== 99) throw "Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)";
          })();
          var __ATPRERUN__ = [];
          var __ATINIT__ = [];
          var __ATMAIN__ = [];
          var __ATEXIT__ = [];
          var __ATPOSTRUN__ = [];
          var runtimeInitialized = false;
          function preRun() {
            if (Module2["preRun"]) {
              if (typeof Module2["preRun"] == "function") Module2["preRun"] = [Module2["preRun"]];
              while (Module2["preRun"].length) {
                addOnPreRun(Module2["preRun"].shift());
              }
            }
            callRuntimeCallbacks(__ATPRERUN__);
          }
          function initRuntime() {
            assert(!runtimeInitialized);
            runtimeInitialized = true;
            checkStackCookie();
            if (!Module2["noFSInit"] && !FS.init.initialized)
              FS.init();
            FS.ignorePermissions = false;
            TTY.init();
            callRuntimeCallbacks(__ATINIT__);
          }
          function preMain() {
            checkStackCookie();
            callRuntimeCallbacks(__ATMAIN__);
          }
          function postRun() {
            checkStackCookie();
            if (Module2["postRun"]) {
              if (typeof Module2["postRun"] == "function") Module2["postRun"] = [Module2["postRun"]];
              while (Module2["postRun"].length) {
                addOnPostRun(Module2["postRun"].shift());
              }
            }
            callRuntimeCallbacks(__ATPOSTRUN__);
          }
          function addOnPreRun(cb) {
            __ATPRERUN__.unshift(cb);
          }
          function addOnInit(cb) {
            __ATINIT__.unshift(cb);
          }
          function addOnPreMain(cb) {
            __ATMAIN__.unshift(cb);
          }
          function addOnExit(cb) {
          }
          function addOnPostRun(cb) {
            __ATPOSTRUN__.unshift(cb);
          }
          assert(Math.imul, "This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
          assert(Math.fround, "This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
          assert(Math.clz32, "This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
          assert(Math.trunc, "This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
          var runDependencies = 0;
          var runDependencyWatcher = null;
          var dependenciesFulfilled = null;
          var runDependencyTracking = {};
          function getUniqueRunDependency(id) {
            var orig = id;
            while (1) {
              if (!runDependencyTracking[id]) return id;
              id = orig + Math.random();
            }
          }
          function addRunDependency(id) {
            runDependencies++;
            if (Module2["monitorRunDependencies"]) {
              Module2["monitorRunDependencies"](runDependencies);
            }
            if (id) {
              assert(!runDependencyTracking[id]);
              runDependencyTracking[id] = 1;
              if (runDependencyWatcher === null && typeof setInterval != "undefined") {
                runDependencyWatcher = setInterval(() => {
                  if (ABORT) {
                    clearInterval(runDependencyWatcher);
                    runDependencyWatcher = null;
                    return;
                  }
                  var shown = false;
                  for (var dep in runDependencyTracking) {
                    if (!shown) {
                      shown = true;
                      err("still waiting on run dependencies:");
                    }
                    err(`dependency: ${dep}`);
                  }
                  if (shown) {
                    err("(end of list)");
                  }
                }, 1e4);
              }
            } else {
              err("warning: run dependency added without ID");
            }
          }
          function removeRunDependency(id) {
            runDependencies--;
            if (Module2["monitorRunDependencies"]) {
              Module2["monitorRunDependencies"](runDependencies);
            }
            if (id) {
              assert(runDependencyTracking[id]);
              delete runDependencyTracking[id];
            } else {
              err("warning: run dependency removed without ID");
            }
            if (runDependencies == 0) {
              if (runDependencyWatcher !== null) {
                clearInterval(runDependencyWatcher);
                runDependencyWatcher = null;
              }
              if (dependenciesFulfilled) {
                var callback = dependenciesFulfilled;
                dependenciesFulfilled = null;
                callback();
              }
            }
          }
          function abort(what) {
            if (Module2["onAbort"]) {
              Module2["onAbort"](what);
            }
            what = "Aborted(" + what + ")";
            err(what);
            ABORT = true;
            EXITSTATUS = 1;
            var e = new WebAssembly.RuntimeError(what);
            readyPromiseReject(e);
            throw e;
          }
          var dataURIPrefix = "data:application/octet-stream;base64,";
          var isDataURI = (filename) => filename.startsWith(dataURIPrefix);
          var isFileURI = (filename) => filename.startsWith("file://");
          function createExportWrapper(name) {
            return function() {
              assert(runtimeInitialized, `native function \`${name}\` called before runtime initialization`);
              var f = wasmExports[name];
              assert(f, `exported native function \`${name}\` not found`);
              return f.apply(null, arguments);
            };
          }
          var wasmBinaryFile;
          if (Module2["locateFile"]) {
            wasmBinaryFile = "espeak-ng.wasm";
            if (!isDataURI(wasmBinaryFile)) {
              wasmBinaryFile = locateFile(wasmBinaryFile);
            }
          } else {
            wasmBinaryFile = new URL("espeak-ng.wasm", import_meta3.url).href;
          }
          function getBinarySync(file) {
            if (file == wasmBinaryFile && wasmBinary) {
              return new Uint8Array(wasmBinary);
            }
            if (readBinary) {
              return readBinary(file);
            }
            throw "both async and sync fetching of the wasm failed";
          }
          function getBinaryPromise(binaryFile) {
            if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
              if (typeof fetch == "function" && !isFileURI(binaryFile)) {
                return fetch(binaryFile, { credentials: "same-origin" }).then((response) => {
                  if (!response["ok"]) {
                    throw "failed to load wasm binary file at '" + binaryFile + "'";
                  }
                  return response["arrayBuffer"]();
                }).catch(() => getBinarySync(binaryFile));
              } else if (readAsync) {
                return new Promise((resolve, reject) => {
                  readAsync(binaryFile, (response) => resolve(new Uint8Array(
                    /** @type{!ArrayBuffer} */
                    response
                  )), reject);
                });
              }
            }
            return Promise.resolve().then(() => getBinarySync(binaryFile));
          }
          function instantiateArrayBuffer(binaryFile, imports, receiver) {
            return getBinaryPromise(binaryFile).then((binary) => {
              return WebAssembly.instantiate(binary, imports);
            }).then((instance) => {
              return instance;
            }).then(receiver, (reason) => {
              err(`failed to asynchronously prepare wasm: ${reason}`);
              if (isFileURI(wasmBinaryFile)) {
                err(`warning: Loading from a file URI (${wasmBinaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`);
              }
              abort(reason);
            });
          }
          function instantiateAsync(binary, binaryFile, imports, callback) {
            if (!binary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(binaryFile) && // Don't use streaming for file:// delivered objects in a webview, fetch them synchronously.
            !isFileURI(binaryFile) && // Avoid instantiateStreaming() on Node.js environment for now, as while
            // Node.js v18.1.0 implements it, it does not have a full fetch()
            // implementation yet.
            //
            // Reference:
            //   https://github.com/emscripten-core/emscripten/pull/16917
            !ENVIRONMENT_IS_NODE && typeof fetch == "function") {
              return fetch(binaryFile, { credentials: "same-origin" }).then((response) => {
                var result = WebAssembly.instantiateStreaming(response, imports);
                return result.then(
                  callback,
                  function(reason) {
                    err(`wasm streaming compile failed: ${reason}`);
                    err("falling back to ArrayBuffer instantiation");
                    return instantiateArrayBuffer(binaryFile, imports, callback);
                  }
                );
              });
            }
            return instantiateArrayBuffer(binaryFile, imports, callback);
          }
          function createWasm() {
            var info = {
              "env": wasmImports,
              "wasi_snapshot_preview1": wasmImports
            };
            function receiveInstance(instance, module) {
              wasmExports = instance.exports;
              wasmMemory = wasmExports["memory"];
              assert(wasmMemory, "memory not found in wasm exports");
              updateMemoryViews();
              addOnInit(wasmExports["__wasm_call_ctors"]);
              removeRunDependency("wasm-instantiate");
              return wasmExports;
            }
            addRunDependency("wasm-instantiate");
            var trueModule = Module2;
            function receiveInstantiationResult(result) {
              assert(Module2 === trueModule, "the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?");
              trueModule = null;
              receiveInstance(result["instance"]);
            }
            if (Module2["instantiateWasm"]) {
              try {
                return Module2["instantiateWasm"](info, receiveInstance);
              } catch (e) {
                err(`Module.instantiateWasm callback failed with error: ${e}`);
                readyPromiseReject(e);
              }
            }
            instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult).catch(readyPromiseReject);
            return {};
          }
          var tempDouble;
          var tempI64;
          function legacyModuleProp(prop, newName, incomming = true) {
            if (!Object.getOwnPropertyDescriptor(Module2, prop)) {
              Object.defineProperty(Module2, prop, {
                configurable: true,
                get() {
                  let extra = incomming ? " (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)" : "";
                  abort(`\`Module.${prop}\` has been replaced by \`${newName}\`` + extra);
                }
              });
            }
          }
          function ignoredModuleProp(prop) {
            if (Object.getOwnPropertyDescriptor(Module2, prop)) {
              abort(`\`Module.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`);
            }
          }
          function isExportedByForceFilesystem(name) {
            return name === "FS_createPath" || name === "FS_createDataFile" || name === "FS_createPreloadedFile" || name === "FS_unlink" || name === "addRunDependency" || // The old FS has some functionality that WasmFS lacks.
            name === "FS_createLazyFile" || name === "FS_createDevice" || name === "removeRunDependency";
          }
          function missingGlobal(sym, msg) {
            if (typeof globalThis !== "undefined") {
              Object.defineProperty(globalThis, sym, {
                configurable: true,
                get() {
                  warnOnce(`\`${sym}\` is not longer defined by emscripten. ${msg}`);
                  return void 0;
                }
              });
            }
          }
          missingGlobal("buffer", "Please use HEAP8.buffer or wasmMemory.buffer");
          missingGlobal("asm", "Please use wasmExports instead");
          function missingLibrarySymbol(sym) {
            if (typeof globalThis !== "undefined" && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
              Object.defineProperty(globalThis, sym, {
                configurable: true,
                get() {
                  var msg = `\`${sym}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`;
                  var librarySymbol = sym;
                  if (!librarySymbol.startsWith("_")) {
                    librarySymbol = "$" + sym;
                  }
                  msg += ` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${librarySymbol}')`;
                  if (isExportedByForceFilesystem(sym)) {
                    msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
                  }
                  warnOnce(msg);
                  return void 0;
                }
              });
            }
            unexportedRuntimeSymbol(sym);
          }
          function unexportedRuntimeSymbol(sym) {
            if (!Object.getOwnPropertyDescriptor(Module2, sym)) {
              Object.defineProperty(Module2, sym, {
                configurable: true,
                get() {
                  var msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;
                  if (isExportedByForceFilesystem(sym)) {
                    msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
                  }
                  abort(msg);
                }
              });
            }
          }
          function dbg(text) {
            console.warn.apply(console, arguments);
          }
          function ExitStatus(status) {
            this.name = "ExitStatus";
            this.message = `Program terminated with exit(${status})`;
            this.status = status;
          }
          var callRuntimeCallbacks = (callbacks) => {
            while (callbacks.length > 0) {
              callbacks.shift()(Module2);
            }
          };
          function getValue(ptr, type = "i8") {
            if (type.endsWith("*")) type = "*";
            switch (type) {
              case "i1":
                return HEAP8[ptr >> 0];
              case "i8":
                return HEAP8[ptr >> 0];
              case "i16":
                return HEAP16[ptr >> 1];
              case "i32":
                return HEAP32[ptr >> 2];
              case "i64":
                abort("to do getValue(i64) use WASM_BIGINT");
              case "float":
                return HEAPF32[ptr >> 2];
              case "double":
                return HEAPF64[ptr >> 3];
              case "*":
                return HEAPU32[ptr >> 2];
              default:
                abort(`invalid type for getValue: ${type}`);
            }
          }
          var noExitRuntime = Module2["noExitRuntime"] || true;
          var ptrToString = (ptr) => {
            assert(typeof ptr === "number");
            ptr >>>= 0;
            return "0x" + ptr.toString(16).padStart(8, "0");
          };
          function setValue(ptr, value, type = "i8") {
            if (type.endsWith("*")) type = "*";
            switch (type) {
              case "i1":
                HEAP8[ptr >> 0] = value;
                break;
              case "i8":
                HEAP8[ptr >> 0] = value;
                break;
              case "i16":
                HEAP16[ptr >> 1] = value;
                break;
              case "i32":
                HEAP32[ptr >> 2] = value;
                break;
              case "i64":
                abort("to do setValue(i64) use WASM_BIGINT");
              case "float":
                HEAPF32[ptr >> 2] = value;
                break;
              case "double":
                HEAPF64[ptr >> 3] = value;
                break;
              case "*":
                HEAPU32[ptr >> 2] = value;
                break;
              default:
                abort(`invalid type for setValue: ${type}`);
            }
          }
          var warnOnce = (text) => {
            if (!warnOnce.shown) warnOnce.shown = {};
            if (!warnOnce.shown[text]) {
              warnOnce.shown[text] = 1;
              if (ENVIRONMENT_IS_NODE) text = "warning: " + text;
              err(text);
            }
          };
          var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : void 0;
          var UTF8ArrayToString = (heapOrArray, idx, maxBytesToRead) => {
            var endIdx = idx + maxBytesToRead;
            var endPtr = idx;
            while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
            if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
              return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
            }
            var str = "";
            while (idx < endPtr) {
              var u0 = heapOrArray[idx++];
              if (!(u0 & 128)) {
                str += String.fromCharCode(u0);
                continue;
              }
              var u1 = heapOrArray[idx++] & 63;
              if ((u0 & 224) == 192) {
                str += String.fromCharCode((u0 & 31) << 6 | u1);
                continue;
              }
              var u2 = heapOrArray[idx++] & 63;
              if ((u0 & 240) == 224) {
                u0 = (u0 & 15) << 12 | u1 << 6 | u2;
              } else {
                if ((u0 & 248) != 240) warnOnce("Invalid UTF-8 leading byte " + ptrToString(u0) + " encountered when deserializing a UTF-8 string in wasm memory to a JS string!");
                u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
              }
              if (u0 < 65536) {
                str += String.fromCharCode(u0);
              } else {
                var ch = u0 - 65536;
                str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
              }
            }
            return str;
          };
          var UTF8ToString = (ptr, maxBytesToRead) => {
            assert(typeof ptr == "number", `UTF8ToString expects a number (got ${typeof ptr})`);
            return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
          };
          var ___assert_fail = (condition, filename, line, func) => {
            abort(`Assertion failed: ${UTF8ToString(condition)}, at: ` + [filename ? UTF8ToString(filename) : "unknown filename", line, func ? UTF8ToString(func) : "unknown function"]);
          };
          var setErrNo = (value) => {
            HEAP32[___errno_location() >> 2] = value;
            return value;
          };
          var PATH = {
            isAbs: (path) => path.charAt(0) === "/",
            splitPath: (filename) => {
              var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
              return splitPathRe.exec(filename).slice(1);
            },
            normalizeArray: (parts, allowAboveRoot) => {
              var up = 0;
              for (var i = parts.length - 1; i >= 0; i--) {
                var last = parts[i];
                if (last === ".") {
                  parts.splice(i, 1);
                } else if (last === "..") {
                  parts.splice(i, 1);
                  up++;
                } else if (up) {
                  parts.splice(i, 1);
                  up--;
                }
              }
              if (allowAboveRoot) {
                for (; up; up--) {
                  parts.unshift("..");
                }
              }
              return parts;
            },
            normalize: (path) => {
              var isAbsolute = PATH.isAbs(path), trailingSlash = path.substr(-1) === "/";
              path = PATH.normalizeArray(path.split("/").filter((p) => !!p), !isAbsolute).join("/");
              if (!path && !isAbsolute) {
                path = ".";
              }
              if (path && trailingSlash) {
                path += "/";
              }
              return (isAbsolute ? "/" : "") + path;
            },
            dirname: (path) => {
              var result = PATH.splitPath(path), root = result[0], dir = result[1];
              if (!root && !dir) {
                return ".";
              }
              if (dir) {
                dir = dir.substr(0, dir.length - 1);
              }
              return root + dir;
            },
            basename: (path) => {
              if (path === "/") return "/";
              path = PATH.normalize(path);
              path = path.replace(/\/$/, "");
              var lastSlash = path.lastIndexOf("/");
              if (lastSlash === -1) return path;
              return path.substr(lastSlash + 1);
            },
            join: function() {
              var paths = Array.prototype.slice.call(arguments);
              return PATH.normalize(paths.join("/"));
            },
            join2: (l, r) => PATH.normalize(l + "/" + r)
          };
          var initRandomFill = () => {
            if (typeof crypto == "object" && typeof crypto["getRandomValues"] == "function") {
              return (view) => crypto.getRandomValues(view);
            } else if (ENVIRONMENT_IS_NODE) {
              try {
                var crypto_module = require2("crypto");
                var randomFillSync = crypto_module["randomFillSync"];
                if (randomFillSync) {
                  return (view) => crypto_module["randomFillSync"](view);
                }
                var randomBytes = crypto_module["randomBytes"];
                return (view) => (view.set(randomBytes(view.byteLength)), // Return the original view to match modern native implementations.
                view);
              } catch (e) {
              }
            }
            abort("no cryptographic support found for randomDevice. consider polyfilling it if you want to use something insecure like Math.random(), e.g. put this in a --pre-js: var crypto = { getRandomValues: (array) => { for (var i = 0; i < array.length; i++) array[i] = (Math.random()*256)|0 } };");
          };
          var randomFill = (view) => {
            return (randomFill = initRandomFill())(view);
          };
          var PATH_FS = {
            resolve: function() {
              var resolvedPath = "", resolvedAbsolute = false;
              for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
                var path = i >= 0 ? arguments[i] : FS.cwd();
                if (typeof path != "string") {
                  throw new TypeError("Arguments to path.resolve must be strings");
                } else if (!path) {
                  return "";
                }
                resolvedPath = path + "/" + resolvedPath;
                resolvedAbsolute = PATH.isAbs(path);
              }
              resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((p) => !!p), !resolvedAbsolute).join("/");
              return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
            },
            relative: (from, to) => {
              from = PATH_FS.resolve(from).substr(1);
              to = PATH_FS.resolve(to).substr(1);
              function trim(arr) {
                var start = 0;
                for (; start < arr.length; start++) {
                  if (arr[start] !== "") break;
                }
                var end = arr.length - 1;
                for (; end >= 0; end--) {
                  if (arr[end] !== "") break;
                }
                if (start > end) return [];
                return arr.slice(start, end - start + 1);
              }
              var fromParts = trim(from.split("/"));
              var toParts = trim(to.split("/"));
              var length = Math.min(fromParts.length, toParts.length);
              var samePartsLength = length;
              for (var i = 0; i < length; i++) {
                if (fromParts[i] !== toParts[i]) {
                  samePartsLength = i;
                  break;
                }
              }
              var outputParts = [];
              for (var i = samePartsLength; i < fromParts.length; i++) {
                outputParts.push("..");
              }
              outputParts = outputParts.concat(toParts.slice(samePartsLength));
              return outputParts.join("/");
            }
          };
          var FS_stdin_getChar_buffer = [];
          var lengthBytesUTF8 = (str) => {
            var len = 0;
            for (var i = 0; i < str.length; ++i) {
              var c = str.charCodeAt(i);
              if (c <= 127) {
                len++;
              } else if (c <= 2047) {
                len += 2;
              } else if (c >= 55296 && c <= 57343) {
                len += 4;
                ++i;
              } else {
                len += 3;
              }
            }
            return len;
          };
          var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
            assert(typeof str === "string", `stringToUTF8Array expects a string (got ${typeof str})`);
            if (!(maxBytesToWrite > 0))
              return 0;
            var startIdx = outIdx;
            var endIdx = outIdx + maxBytesToWrite - 1;
            for (var i = 0; i < str.length; ++i) {
              var u = str.charCodeAt(i);
              if (u >= 55296 && u <= 57343) {
                var u1 = str.charCodeAt(++i);
                u = 65536 + ((u & 1023) << 10) | u1 & 1023;
              }
              if (u <= 127) {
                if (outIdx >= endIdx) break;
                heap[outIdx++] = u;
              } else if (u <= 2047) {
                if (outIdx + 1 >= endIdx) break;
                heap[outIdx++] = 192 | u >> 6;
                heap[outIdx++] = 128 | u & 63;
              } else if (u <= 65535) {
                if (outIdx + 2 >= endIdx) break;
                heap[outIdx++] = 224 | u >> 12;
                heap[outIdx++] = 128 | u >> 6 & 63;
                heap[outIdx++] = 128 | u & 63;
              } else {
                if (outIdx + 3 >= endIdx) break;
                if (u > 1114111) warnOnce("Invalid Unicode code point " + ptrToString(u) + " encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).");
                heap[outIdx++] = 240 | u >> 18;
                heap[outIdx++] = 128 | u >> 12 & 63;
                heap[outIdx++] = 128 | u >> 6 & 63;
                heap[outIdx++] = 128 | u & 63;
              }
            }
            heap[outIdx] = 0;
            return outIdx - startIdx;
          };
          function intArrayFromString(stringy, dontAddNull, length) {
            var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
            var u8array = new Array(len);
            var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
            if (dontAddNull) u8array.length = numBytesWritten;
            return u8array;
          }
          var FS_stdin_getChar = () => {
            if (!FS_stdin_getChar_buffer.length) {
              var result = null;
              if (ENVIRONMENT_IS_NODE) {
                var BUFSIZE = 256;
                var buf = Buffer.alloc(BUFSIZE);
                var bytesRead = 0;
                var fd = process.stdin.fd;
                try {
                  bytesRead = fs.readSync(fd, buf);
                } catch (e) {
                  if (e.toString().includes("EOF")) bytesRead = 0;
                  else throw e;
                }
                if (bytesRead > 0) {
                  result = buf.slice(0, bytesRead).toString("utf-8");
                } else {
                  result = null;
                }
              } else if (typeof window != "undefined" && typeof window.prompt == "function") {
                result = window.prompt("Input: ");
                if (result !== null) {
                  result += "\n";
                }
              } else if (typeof readline == "function") {
                result = readline();
                if (result !== null) {
                  result += "\n";
                }
              }
              if (!result) {
                return null;
              }
              FS_stdin_getChar_buffer = intArrayFromString(result, true);
            }
            return FS_stdin_getChar_buffer.shift();
          };
          var TTY = {
            ttys: [],
            init() {
            },
            shutdown() {
            },
            register(dev, ops) {
              TTY.ttys[dev] = { input: [], output: [], ops };
              FS.registerDevice(dev, TTY.stream_ops);
            },
            stream_ops: {
              open(stream) {
                var tty = TTY.ttys[stream.node.rdev];
                if (!tty) {
                  throw new FS.ErrnoError(43);
                }
                stream.tty = tty;
                stream.seekable = false;
              },
              close(stream) {
                stream.tty.ops.fsync(stream.tty);
              },
              fsync(stream) {
                stream.tty.ops.fsync(stream.tty);
              },
              read(stream, buffer, offset, length, pos) {
                if (!stream.tty || !stream.tty.ops.get_char) {
                  throw new FS.ErrnoError(60);
                }
                var bytesRead = 0;
                for (var i = 0; i < length; i++) {
                  var result;
                  try {
                    result = stream.tty.ops.get_char(stream.tty);
                  } catch (e) {
                    throw new FS.ErrnoError(29);
                  }
                  if (result === void 0 && bytesRead === 0) {
                    throw new FS.ErrnoError(6);
                  }
                  if (result === null || result === void 0) break;
                  bytesRead++;
                  buffer[offset + i] = result;
                }
                if (bytesRead) {
                  stream.node.timestamp = Date.now();
                }
                return bytesRead;
              },
              write(stream, buffer, offset, length, pos) {
                if (!stream.tty || !stream.tty.ops.put_char) {
                  throw new FS.ErrnoError(60);
                }
                try {
                  for (var i = 0; i < length; i++) {
                    stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
                  }
                } catch (e) {
                  throw new FS.ErrnoError(29);
                }
                if (length) {
                  stream.node.timestamp = Date.now();
                }
                return i;
              }
            },
            default_tty_ops: {
              get_char(tty) {
                return FS_stdin_getChar();
              },
              put_char(tty, val) {
                if (val === null || val === 10) {
                  out(UTF8ArrayToString(tty.output, 0));
                  tty.output = [];
                } else {
                  if (val != 0) tty.output.push(val);
                }
              },
              fsync(tty) {
                if (tty.output && tty.output.length > 0) {
                  out(UTF8ArrayToString(tty.output, 0));
                  tty.output = [];
                }
              },
              ioctl_tcgets(tty) {
                return {
                  c_iflag: 25856,
                  c_oflag: 5,
                  c_cflag: 191,
                  c_lflag: 35387,
                  c_cc: [
                    3,
                    28,
                    127,
                    21,
                    4,
                    0,
                    1,
                    0,
                    17,
                    19,
                    26,
                    0,
                    18,
                    15,
                    23,
                    22,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0
                  ]
                };
              },
              ioctl_tcsets(tty, optional_actions, data) {
                return 0;
              },
              ioctl_tiocgwinsz(tty) {
                return [24, 80];
              }
            },
            default_tty1_ops: {
              put_char(tty, val) {
                if (val === null || val === 10) {
                  err(UTF8ArrayToString(tty.output, 0));
                  tty.output = [];
                } else {
                  if (val != 0) tty.output.push(val);
                }
              },
              fsync(tty) {
                if (tty.output && tty.output.length > 0) {
                  err(UTF8ArrayToString(tty.output, 0));
                  tty.output = [];
                }
              }
            }
          };
          var zeroMemory = (address, size) => {
            HEAPU8.fill(0, address, address + size);
            return address;
          };
          var alignMemory = (size, alignment) => {
            assert(alignment, "alignment argument is required");
            return Math.ceil(size / alignment) * alignment;
          };
          var mmapAlloc = (size) => {
            abort("internal error: mmapAlloc called but `emscripten_builtin_memalign` native symbol not exported");
          };
          var MEMFS = {
            ops_table: null,
            mount(mount) {
              return MEMFS.createNode(null, "/", 16384 | 511, 0);
            },
            createNode(parent, name, mode, dev) {
              if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
                throw new FS.ErrnoError(63);
              }
              if (!MEMFS.ops_table) {
                MEMFS.ops_table = {
                  dir: {
                    node: {
                      getattr: MEMFS.node_ops.getattr,
                      setattr: MEMFS.node_ops.setattr,
                      lookup: MEMFS.node_ops.lookup,
                      mknod: MEMFS.node_ops.mknod,
                      rename: MEMFS.node_ops.rename,
                      unlink: MEMFS.node_ops.unlink,
                      rmdir: MEMFS.node_ops.rmdir,
                      readdir: MEMFS.node_ops.readdir,
                      symlink: MEMFS.node_ops.symlink
                    },
                    stream: {
                      llseek: MEMFS.stream_ops.llseek
                    }
                  },
                  file: {
                    node: {
                      getattr: MEMFS.node_ops.getattr,
                      setattr: MEMFS.node_ops.setattr
                    },
                    stream: {
                      llseek: MEMFS.stream_ops.llseek,
                      read: MEMFS.stream_ops.read,
                      write: MEMFS.stream_ops.write,
                      allocate: MEMFS.stream_ops.allocate,
                      mmap: MEMFS.stream_ops.mmap,
                      msync: MEMFS.stream_ops.msync
                    }
                  },
                  link: {
                    node: {
                      getattr: MEMFS.node_ops.getattr,
                      setattr: MEMFS.node_ops.setattr,
                      readlink: MEMFS.node_ops.readlink
                    },
                    stream: {}
                  },
                  chrdev: {
                    node: {
                      getattr: MEMFS.node_ops.getattr,
                      setattr: MEMFS.node_ops.setattr
                    },
                    stream: FS.chrdev_stream_ops
                  }
                };
              }
              var node = FS.createNode(parent, name, mode, dev);
              if (FS.isDir(node.mode)) {
                node.node_ops = MEMFS.ops_table.dir.node;
                node.stream_ops = MEMFS.ops_table.dir.stream;
                node.contents = {};
              } else if (FS.isFile(node.mode)) {
                node.node_ops = MEMFS.ops_table.file.node;
                node.stream_ops = MEMFS.ops_table.file.stream;
                node.usedBytes = 0;
                node.contents = null;
              } else if (FS.isLink(node.mode)) {
                node.node_ops = MEMFS.ops_table.link.node;
                node.stream_ops = MEMFS.ops_table.link.stream;
              } else if (FS.isChrdev(node.mode)) {
                node.node_ops = MEMFS.ops_table.chrdev.node;
                node.stream_ops = MEMFS.ops_table.chrdev.stream;
              }
              node.timestamp = Date.now();
              if (parent) {
                parent.contents[name] = node;
                parent.timestamp = node.timestamp;
              }
              return node;
            },
            getFileDataAsTypedArray(node) {
              if (!node.contents) return new Uint8Array(0);
              if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
              return new Uint8Array(node.contents);
            },
            expandFileStorage(node, newCapacity) {
              var prevCapacity = node.contents ? node.contents.length : 0;
              if (prevCapacity >= newCapacity) return;
              var CAPACITY_DOUBLING_MAX = 1024 * 1024;
              newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
              if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
              var oldContents = node.contents;
              node.contents = new Uint8Array(newCapacity);
              if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
            },
            resizeFileStorage(node, newSize) {
              if (node.usedBytes == newSize) return;
              if (newSize == 0) {
                node.contents = null;
                node.usedBytes = 0;
              } else {
                var oldContents = node.contents;
                node.contents = new Uint8Array(newSize);
                if (oldContents) {
                  node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
                }
                node.usedBytes = newSize;
              }
            },
            node_ops: {
              getattr(node) {
                var attr = {};
                attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
                attr.ino = node.id;
                attr.mode = node.mode;
                attr.nlink = 1;
                attr.uid = 0;
                attr.gid = 0;
                attr.rdev = node.rdev;
                if (FS.isDir(node.mode)) {
                  attr.size = 4096;
                } else if (FS.isFile(node.mode)) {
                  attr.size = node.usedBytes;
                } else if (FS.isLink(node.mode)) {
                  attr.size = node.link.length;
                } else {
                  attr.size = 0;
                }
                attr.atime = new Date(node.timestamp);
                attr.mtime = new Date(node.timestamp);
                attr.ctime = new Date(node.timestamp);
                attr.blksize = 4096;
                attr.blocks = Math.ceil(attr.size / attr.blksize);
                return attr;
              },
              setattr(node, attr) {
                if (attr.mode !== void 0) {
                  node.mode = attr.mode;
                }
                if (attr.timestamp !== void 0) {
                  node.timestamp = attr.timestamp;
                }
                if (attr.size !== void 0) {
                  MEMFS.resizeFileStorage(node, attr.size);
                }
              },
              lookup(parent, name) {
                throw FS.genericErrors[44];
              },
              mknod(parent, name, mode, dev) {
                return MEMFS.createNode(parent, name, mode, dev);
              },
              rename(old_node, new_dir, new_name) {
                if (FS.isDir(old_node.mode)) {
                  var new_node;
                  try {
                    new_node = FS.lookupNode(new_dir, new_name);
                  } catch (e) {
                  }
                  if (new_node) {
                    for (var i in new_node.contents) {
                      throw new FS.ErrnoError(55);
                    }
                  }
                }
                delete old_node.parent.contents[old_node.name];
                old_node.parent.timestamp = Date.now();
                old_node.name = new_name;
                new_dir.contents[new_name] = old_node;
                new_dir.timestamp = old_node.parent.timestamp;
                old_node.parent = new_dir;
              },
              unlink(parent, name) {
                delete parent.contents[name];
                parent.timestamp = Date.now();
              },
              rmdir(parent, name) {
                var node = FS.lookupNode(parent, name);
                for (var i in node.contents) {
                  throw new FS.ErrnoError(55);
                }
                delete parent.contents[name];
                parent.timestamp = Date.now();
              },
              readdir(node) {
                var entries = [".", ".."];
                for (var key in node.contents) {
                  if (!node.contents.hasOwnProperty(key)) {
                    continue;
                  }
                  entries.push(key);
                }
                return entries;
              },
              symlink(parent, newname, oldpath) {
                var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
                node.link = oldpath;
                return node;
              },
              readlink(node) {
                if (!FS.isLink(node.mode)) {
                  throw new FS.ErrnoError(28);
                }
                return node.link;
              }
            },
            stream_ops: {
              read(stream, buffer, offset, length, position) {
                var contents = stream.node.contents;
                if (position >= stream.node.usedBytes) return 0;
                var size = Math.min(stream.node.usedBytes - position, length);
                assert(size >= 0);
                if (size > 8 && contents.subarray) {
                  buffer.set(contents.subarray(position, position + size), offset);
                } else {
                  for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
                }
                return size;
              },
              write(stream, buffer, offset, length, position, canOwn) {
                assert(!(buffer instanceof ArrayBuffer));
                if (!length) return 0;
                var node = stream.node;
                node.timestamp = Date.now();
                if (buffer.subarray && (!node.contents || node.contents.subarray)) {
                  if (canOwn) {
                    assert(position === 0, "canOwn must imply no weird position inside the file");
                    node.contents = buffer.subarray(offset, offset + length);
                    node.usedBytes = length;
                    return length;
                  } else if (node.usedBytes === 0 && position === 0) {
                    node.contents = buffer.slice(offset, offset + length);
                    node.usedBytes = length;
                    return length;
                  } else if (position + length <= node.usedBytes) {
                    node.contents.set(buffer.subarray(offset, offset + length), position);
                    return length;
                  }
                }
                MEMFS.expandFileStorage(node, position + length);
                if (node.contents.subarray && buffer.subarray) {
                  node.contents.set(buffer.subarray(offset, offset + length), position);
                } else {
                  for (var i = 0; i < length; i++) {
                    node.contents[position + i] = buffer[offset + i];
                  }
                }
                node.usedBytes = Math.max(node.usedBytes, position + length);
                return length;
              },
              llseek(stream, offset, whence) {
                var position = offset;
                if (whence === 1) {
                  position += stream.position;
                } else if (whence === 2) {
                  if (FS.isFile(stream.node.mode)) {
                    position += stream.node.usedBytes;
                  }
                }
                if (position < 0) {
                  throw new FS.ErrnoError(28);
                }
                return position;
              },
              allocate(stream, offset, length) {
                MEMFS.expandFileStorage(stream.node, offset + length);
                stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
              },
              mmap(stream, length, position, prot, flags) {
                if (!FS.isFile(stream.node.mode)) {
                  throw new FS.ErrnoError(43);
                }
                var ptr;
                var allocated;
                var contents = stream.node.contents;
                if (!(flags & 2) && contents.buffer === HEAP8.buffer) {
                  allocated = false;
                  ptr = contents.byteOffset;
                } else {
                  if (position > 0 || position + length < contents.length) {
                    if (contents.subarray) {
                      contents = contents.subarray(position, position + length);
                    } else {
                      contents = Array.prototype.slice.call(contents, position, position + length);
                    }
                  }
                  allocated = true;
                  ptr = mmapAlloc(length);
                  if (!ptr) {
                    throw new FS.ErrnoError(48);
                  }
                  HEAP8.set(contents, ptr);
                }
                return { ptr, allocated };
              },
              msync(stream, buffer, offset, length, mmapFlags) {
                MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
                return 0;
              }
            }
          };
          var asyncLoad = (url, onload, onerror, noRunDep) => {
            var dep = !noRunDep ? getUniqueRunDependency(`al ${url}`) : "";
            readAsync(url, (arrayBuffer) => {
              assert(arrayBuffer, `Loading data file "${url}" failed (no arrayBuffer).`);
              onload(new Uint8Array(arrayBuffer));
              if (dep) removeRunDependency(dep);
            }, (event) => {
              if (onerror) {
                onerror();
              } else {
                throw `Loading data file "${url}" failed.`;
              }
            });
            if (dep) addRunDependency(dep);
          };
          var FS_createDataFile = (parent, name, fileData, canRead, canWrite, canOwn) => {
            FS.createDataFile(parent, name, fileData, canRead, canWrite, canOwn);
          };
          var preloadPlugins = Module2["preloadPlugins"] || [];
          var FS_handledByPreloadPlugin = (byteArray, fullname, finish, onerror) => {
            if (typeof Browser != "undefined") Browser.init();
            var handled = false;
            preloadPlugins.forEach((plugin) => {
              if (handled) return;
              if (plugin["canHandle"](fullname)) {
                plugin["handle"](byteArray, fullname, finish, onerror);
                handled = true;
              }
            });
            return handled;
          };
          var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
            var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
            var dep = getUniqueRunDependency(`cp ${fullname}`);
            function processData(byteArray) {
              function finish(byteArray2) {
                if (preFinish) preFinish();
                if (!dontCreateFile) {
                  FS_createDataFile(parent, name, byteArray2, canRead, canWrite, canOwn);
                }
                if (onload) onload();
                removeRunDependency(dep);
              }
              if (FS_handledByPreloadPlugin(byteArray, fullname, finish, () => {
                if (onerror) onerror();
                removeRunDependency(dep);
              })) {
                return;
              }
              finish(byteArray);
            }
            addRunDependency(dep);
            if (typeof url == "string") {
              asyncLoad(url, (byteArray) => processData(byteArray), onerror);
            } else {
              processData(url);
            }
          };
          var FS_modeStringToFlags = (str) => {
            var flagModes = {
              "r": 0,
              "r+": 2,
              "w": 512 | 64 | 1,
              "w+": 512 | 64 | 2,
              "a": 1024 | 64 | 1,
              "a+": 1024 | 64 | 2
            };
            var flags = flagModes[str];
            if (typeof flags == "undefined") {
              throw new Error(`Unknown file open mode: ${str}`);
            }
            return flags;
          };
          var FS_getMode = (canRead, canWrite) => {
            var mode = 0;
            if (canRead) mode |= 292 | 73;
            if (canWrite) mode |= 146;
            return mode;
          };
          var ERRNO_MESSAGES = {
            0: "Success",
            1: "Arg list too long",
            2: "Permission denied",
            3: "Address already in use",
            4: "Address not available",
            5: "Address family not supported by protocol family",
            6: "No more processes",
            7: "Socket already connected",
            8: "Bad file number",
            9: "Trying to read unreadable message",
            10: "Mount device busy",
            11: "Operation canceled",
            12: "No children",
            13: "Connection aborted",
            14: "Connection refused",
            15: "Connection reset by peer",
            16: "File locking deadlock error",
            17: "Destination address required",
            18: "Math arg out of domain of func",
            19: "Quota exceeded",
            20: "File exists",
            21: "Bad address",
            22: "File too large",
            23: "Host is unreachable",
            24: "Identifier removed",
            25: "Illegal byte sequence",
            26: "Connection already in progress",
            27: "Interrupted system call",
            28: "Invalid argument",
            29: "I/O error",
            30: "Socket is already connected",
            31: "Is a directory",
            32: "Too many symbolic links",
            33: "Too many open files",
            34: "Too many links",
            35: "Message too long",
            36: "Multihop attempted",
            37: "File or path name too long",
            38: "Network interface is not configured",
            39: "Connection reset by network",
            40: "Network is unreachable",
            41: "Too many open files in system",
            42: "No buffer space available",
            43: "No such device",
            44: "No such file or directory",
            45: "Exec format error",
            46: "No record locks available",
            47: "The link has been severed",
            48: "Not enough core",
            49: "No message of desired type",
            50: "Protocol not available",
            51: "No space left on device",
            52: "Function not implemented",
            53: "Socket is not connected",
            54: "Not a directory",
            55: "Directory not empty",
            56: "State not recoverable",
            57: "Socket operation on non-socket",
            59: "Not a typewriter",
            60: "No such device or address",
            61: "Value too large for defined data type",
            62: "Previous owner died",
            63: "Not super-user",
            64: "Broken pipe",
            65: "Protocol error",
            66: "Unknown protocol",
            67: "Protocol wrong type for socket",
            68: "Math result not representable",
            69: "Read only file system",
            70: "Illegal seek",
            71: "No such process",
            72: "Stale file handle",
            73: "Connection timed out",
            74: "Text file busy",
            75: "Cross-device link",
            100: "Device not a stream",
            101: "Bad font file fmt",
            102: "Invalid slot",
            103: "Invalid request code",
            104: "No anode",
            105: "Block device required",
            106: "Channel number out of range",
            107: "Level 3 halted",
            108: "Level 3 reset",
            109: "Link number out of range",
            110: "Protocol driver not attached",
            111: "No CSI structure available",
            112: "Level 2 halted",
            113: "Invalid exchange",
            114: "Invalid request descriptor",
            115: "Exchange full",
            116: "No data (for no delay io)",
            117: "Timer expired",
            118: "Out of streams resources",
            119: "Machine is not on the network",
            120: "Package not installed",
            121: "The object is remote",
            122: "Advertise error",
            123: "Srmount error",
            124: "Communication error on send",
            125: "Cross mount point (not really error)",
            126: "Given log. name not unique",
            127: "f.d. invalid for this operation",
            128: "Remote address changed",
            129: "Can   access a needed shared lib",
            130: "Accessing a corrupted shared lib",
            131: ".lib section in a.out corrupted",
            132: "Attempting to link in too many libs",
            133: "Attempting to exec a shared library",
            135: "Streams pipe error",
            136: "Too many users",
            137: "Socket type not supported",
            138: "Not supported",
            139: "Protocol family not supported",
            140: "Can't send after socket shutdown",
            141: "Too many references",
            142: "Host is down",
            148: "No medium (in tape drive)",
            156: "Level 2 not synchronized"
          };
          var ERRNO_CODES = {
            "EPERM": 63,
            "ENOENT": 44,
            "ESRCH": 71,
            "EINTR": 27,
            "EIO": 29,
            "ENXIO": 60,
            "E2BIG": 1,
            "ENOEXEC": 45,
            "EBADF": 8,
            "ECHILD": 12,
            "EAGAIN": 6,
            "EWOULDBLOCK": 6,
            "ENOMEM": 48,
            "EACCES": 2,
            "EFAULT": 21,
            "ENOTBLK": 105,
            "EBUSY": 10,
            "EEXIST": 20,
            "EXDEV": 75,
            "ENODEV": 43,
            "ENOTDIR": 54,
            "EISDIR": 31,
            "EINVAL": 28,
            "ENFILE": 41,
            "EMFILE": 33,
            "ENOTTY": 59,
            "ETXTBSY": 74,
            "EFBIG": 22,
            "ENOSPC": 51,
            "ESPIPE": 70,
            "EROFS": 69,
            "EMLINK": 34,
            "EPIPE": 64,
            "EDOM": 18,
            "ERANGE": 68,
            "ENOMSG": 49,
            "EIDRM": 24,
            "ECHRNG": 106,
            "EL2NSYNC": 156,
            "EL3HLT": 107,
            "EL3RST": 108,
            "ELNRNG": 109,
            "EUNATCH": 110,
            "ENOCSI": 111,
            "EL2HLT": 112,
            "EDEADLK": 16,
            "ENOLCK": 46,
            "EBADE": 113,
            "EBADR": 114,
            "EXFULL": 115,
            "ENOANO": 104,
            "EBADRQC": 103,
            "EBADSLT": 102,
            "EDEADLOCK": 16,
            "EBFONT": 101,
            "ENOSTR": 100,
            "ENODATA": 116,
            "ETIME": 117,
            "ENOSR": 118,
            "ENONET": 119,
            "ENOPKG": 120,
            "EREMOTE": 121,
            "ENOLINK": 47,
            "EADV": 122,
            "ESRMNT": 123,
            "ECOMM": 124,
            "EPROTO": 65,
            "EMULTIHOP": 36,
            "EDOTDOT": 125,
            "EBADMSG": 9,
            "ENOTUNIQ": 126,
            "EBADFD": 127,
            "EREMCHG": 128,
            "ELIBACC": 129,
            "ELIBBAD": 130,
            "ELIBSCN": 131,
            "ELIBMAX": 132,
            "ELIBEXEC": 133,
            "ENOSYS": 52,
            "ENOTEMPTY": 55,
            "ENAMETOOLONG": 37,
            "ELOOP": 32,
            "EOPNOTSUPP": 138,
            "EPFNOSUPPORT": 139,
            "ECONNRESET": 15,
            "ENOBUFS": 42,
            "EAFNOSUPPORT": 5,
            "EPROTOTYPE": 67,
            "ENOTSOCK": 57,
            "ENOPROTOOPT": 50,
            "ESHUTDOWN": 140,
            "ECONNREFUSED": 14,
            "EADDRINUSE": 3,
            "ECONNABORTED": 13,
            "ENETUNREACH": 40,
            "ENETDOWN": 38,
            "ETIMEDOUT": 73,
            "EHOSTDOWN": 142,
            "EHOSTUNREACH": 23,
            "EINPROGRESS": 26,
            "EALREADY": 7,
            "EDESTADDRREQ": 17,
            "EMSGSIZE": 35,
            "EPROTONOSUPPORT": 66,
            "ESOCKTNOSUPPORT": 137,
            "EADDRNOTAVAIL": 4,
            "ENETRESET": 39,
            "EISCONN": 30,
            "ENOTCONN": 53,
            "ETOOMANYREFS": 141,
            "EUSERS": 136,
            "EDQUOT": 19,
            "ESTALE": 72,
            "ENOTSUP": 138,
            "ENOMEDIUM": 148,
            "EILSEQ": 25,
            "EOVERFLOW": 61,
            "ECANCELED": 11,
            "ENOTRECOVERABLE": 56,
            "EOWNERDEAD": 62,
            "ESTRPIPE": 135
          };
          var demangle = (func) => {
            warnOnce("warning: build with -sDEMANGLE_SUPPORT to link in libcxxabi demangling");
            return func;
          };
          var demangleAll = (text) => {
            var regex = /\b_Z[\w\d_]+/g;
            return text.replace(
              regex,
              function(x) {
                var y = demangle(x);
                return x === y ? x : y + " [" + x + "]";
              }
            );
          };
          var FS = {
            root: null,
            mounts: [],
            devices: {},
            streams: [],
            nextInode: 1,
            nameTable: null,
            currentPath: "/",
            initialized: false,
            ignorePermissions: true,
            ErrnoError: null,
            genericErrors: {},
            filesystems: null,
            syncFSRequests: 0,
            lookupPath(path, opts = {}) {
              path = PATH_FS.resolve(path);
              if (!path) return { path: "", node: null };
              var defaults = {
                follow_mount: true,
                recurse_count: 0
              };
              opts = Object.assign(defaults, opts);
              if (opts.recurse_count > 8) {
                throw new FS.ErrnoError(32);
              }
              var parts = path.split("/").filter((p) => !!p);
              var current = FS.root;
              var current_path = "/";
              for (var i = 0; i < parts.length; i++) {
                var islast = i === parts.length - 1;
                if (islast && opts.parent) {
                  break;
                }
                current = FS.lookupNode(current, parts[i]);
                current_path = PATH.join2(current_path, parts[i]);
                if (FS.isMountpoint(current)) {
                  if (!islast || islast && opts.follow_mount) {
                    current = current.mounted.root;
                  }
                }
                if (!islast || opts.follow) {
                  var count = 0;
                  while (FS.isLink(current.mode)) {
                    var link = FS.readlink(current_path);
                    current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
                    var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count + 1 });
                    current = lookup.node;
                    if (count++ > 40) {
                      throw new FS.ErrnoError(32);
                    }
                  }
                }
              }
              return { path: current_path, node: current };
            },
            getPath(node) {
              var path;
              while (true) {
                if (FS.isRoot(node)) {
                  var mount = node.mount.mountpoint;
                  if (!path) return mount;
                  return mount[mount.length - 1] !== "/" ? `${mount}/${path}` : mount + path;
                }
                path = path ? `${node.name}/${path}` : node.name;
                node = node.parent;
              }
            },
            hashName(parentid, name) {
              var hash = 0;
              for (var i = 0; i < name.length; i++) {
                hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
              }
              return (parentid + hash >>> 0) % FS.nameTable.length;
            },
            hashAddNode(node) {
              var hash = FS.hashName(node.parent.id, node.name);
              node.name_next = FS.nameTable[hash];
              FS.nameTable[hash] = node;
            },
            hashRemoveNode(node) {
              var hash = FS.hashName(node.parent.id, node.name);
              if (FS.nameTable[hash] === node) {
                FS.nameTable[hash] = node.name_next;
              } else {
                var current = FS.nameTable[hash];
                while (current) {
                  if (current.name_next === node) {
                    current.name_next = node.name_next;
                    break;
                  }
                  current = current.name_next;
                }
              }
            },
            lookupNode(parent, name) {
              var errCode = FS.mayLookup(parent);
              if (errCode) {
                throw new FS.ErrnoError(errCode, parent);
              }
              var hash = FS.hashName(parent.id, name);
              for (var node = FS.nameTable[hash]; node; node = node.name_next) {
                var nodeName = node.name;
                if (node.parent.id === parent.id && nodeName === name) {
                  return node;
                }
              }
              return FS.lookup(parent, name);
            },
            createNode(parent, name, mode, rdev) {
              assert(typeof parent == "object");
              var node = new FS.FSNode(parent, name, mode, rdev);
              FS.hashAddNode(node);
              return node;
            },
            destroyNode(node) {
              FS.hashRemoveNode(node);
            },
            isRoot(node) {
              return node === node.parent;
            },
            isMountpoint(node) {
              return !!node.mounted;
            },
            isFile(mode) {
              return (mode & 61440) === 32768;
            },
            isDir(mode) {
              return (mode & 61440) === 16384;
            },
            isLink(mode) {
              return (mode & 61440) === 40960;
            },
            isChrdev(mode) {
              return (mode & 61440) === 8192;
            },
            isBlkdev(mode) {
              return (mode & 61440) === 24576;
            },
            isFIFO(mode) {
              return (mode & 61440) === 4096;
            },
            isSocket(mode) {
              return (mode & 49152) === 49152;
            },
            flagsToPermissionString(flag) {
              var perms = ["r", "w", "rw"][flag & 3];
              if (flag & 512) {
                perms += "w";
              }
              return perms;
            },
            nodePermissions(node, perms) {
              if (FS.ignorePermissions) {
                return 0;
              }
              if (perms.includes("r") && !(node.mode & 292)) {
                return 2;
              } else if (perms.includes("w") && !(node.mode & 146)) {
                return 2;
              } else if (perms.includes("x") && !(node.mode & 73)) {
                return 2;
              }
              return 0;
            },
            mayLookup(dir) {
              var errCode = FS.nodePermissions(dir, "x");
              if (errCode) return errCode;
              if (!dir.node_ops.lookup) return 2;
              return 0;
            },
            mayCreate(dir, name) {
              try {
                var node = FS.lookupNode(dir, name);
                return 20;
              } catch (e) {
              }
              return FS.nodePermissions(dir, "wx");
            },
            mayDelete(dir, name, isdir) {
              var node;
              try {
                node = FS.lookupNode(dir, name);
              } catch (e) {
                return e.errno;
              }
              var errCode = FS.nodePermissions(dir, "wx");
              if (errCode) {
                return errCode;
              }
              if (isdir) {
                if (!FS.isDir(node.mode)) {
                  return 54;
                }
                if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
                  return 10;
                }
              } else {
                if (FS.isDir(node.mode)) {
                  return 31;
                }
              }
              return 0;
            },
            mayOpen(node, flags) {
              if (!node) {
                return 44;
              }
              if (FS.isLink(node.mode)) {
                return 32;
              } else if (FS.isDir(node.mode)) {
                if (FS.flagsToPermissionString(flags) !== "r" || // opening for write
                flags & 512) {
                  return 31;
                }
              }
              return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
            },
            MAX_OPEN_FDS: 4096,
            nextfd() {
              for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
                if (!FS.streams[fd]) {
                  return fd;
                }
              }
              throw new FS.ErrnoError(33);
            },
            getStreamChecked(fd) {
              var stream = FS.getStream(fd);
              if (!stream) {
                throw new FS.ErrnoError(8);
              }
              return stream;
            },
            getStream: (fd) => FS.streams[fd],
            createStream(stream, fd = -1) {
              if (!FS.FSStream) {
                FS.FSStream = /** @constructor */
                function() {
                  this.shared = {};
                };
                FS.FSStream.prototype = {};
                Object.defineProperties(FS.FSStream.prototype, {
                  object: {
                    /** @this {FS.FSStream} */
                    get() {
                      return this.node;
                    },
                    /** @this {FS.FSStream} */
                    set(val) {
                      this.node = val;
                    }
                  },
                  isRead: {
                    /** @this {FS.FSStream} */
                    get() {
                      return (this.flags & 2097155) !== 1;
                    }
                  },
                  isWrite: {
                    /** @this {FS.FSStream} */
                    get() {
                      return (this.flags & 2097155) !== 0;
                    }
                  },
                  isAppend: {
                    /** @this {FS.FSStream} */
                    get() {
                      return this.flags & 1024;
                    }
                  },
                  flags: {
                    /** @this {FS.FSStream} */
                    get() {
                      return this.shared.flags;
                    },
                    /** @this {FS.FSStream} */
                    set(val) {
                      this.shared.flags = val;
                    }
                  },
                  position: {
                    /** @this {FS.FSStream} */
                    get() {
                      return this.shared.position;
                    },
                    /** @this {FS.FSStream} */
                    set(val) {
                      this.shared.position = val;
                    }
                  }
                });
              }
              stream = Object.assign(new FS.FSStream(), stream);
              if (fd == -1) {
                fd = FS.nextfd();
              }
              stream.fd = fd;
              FS.streams[fd] = stream;
              return stream;
            },
            closeStream(fd) {
              FS.streams[fd] = null;
            },
            chrdev_stream_ops: {
              open(stream) {
                var device = FS.getDevice(stream.node.rdev);
                stream.stream_ops = device.stream_ops;
                if (stream.stream_ops.open) {
                  stream.stream_ops.open(stream);
                }
              },
              llseek() {
                throw new FS.ErrnoError(70);
              }
            },
            major: (dev) => dev >> 8,
            minor: (dev) => dev & 255,
            makedev: (ma, mi) => ma << 8 | mi,
            registerDevice(dev, ops) {
              FS.devices[dev] = { stream_ops: ops };
            },
            getDevice: (dev) => FS.devices[dev],
            getMounts(mount) {
              var mounts = [];
              var check = [mount];
              while (check.length) {
                var m = check.pop();
                mounts.push(m);
                check.push.apply(check, m.mounts);
              }
              return mounts;
            },
            syncfs(populate, callback) {
              if (typeof populate == "function") {
                callback = populate;
                populate = false;
              }
              FS.syncFSRequests++;
              if (FS.syncFSRequests > 1) {
                err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
              }
              var mounts = FS.getMounts(FS.root.mount);
              var completed = 0;
              function doCallback(errCode) {
                assert(FS.syncFSRequests > 0);
                FS.syncFSRequests--;
                return callback(errCode);
              }
              function done(errCode) {
                if (errCode) {
                  if (!done.errored) {
                    done.errored = true;
                    return doCallback(errCode);
                  }
                  return;
                }
                if (++completed >= mounts.length) {
                  doCallback(null);
                }
              }
              ;
              mounts.forEach((mount) => {
                if (!mount.type.syncfs) {
                  return done(null);
                }
                mount.type.syncfs(mount, populate, done);
              });
            },
            mount(type, opts, mountpoint) {
              if (typeof type == "string") {
                throw type;
              }
              var root = mountpoint === "/";
              var pseudo = !mountpoint;
              var node;
              if (root && FS.root) {
                throw new FS.ErrnoError(10);
              } else if (!root && !pseudo) {
                var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
                mountpoint = lookup.path;
                node = lookup.node;
                if (FS.isMountpoint(node)) {
                  throw new FS.ErrnoError(10);
                }
                if (!FS.isDir(node.mode)) {
                  throw new FS.ErrnoError(54);
                }
              }
              var mount = {
                type,
                opts,
                mountpoint,
                mounts: []
              };
              var mountRoot = type.mount(mount);
              mountRoot.mount = mount;
              mount.root = mountRoot;
              if (root) {
                FS.root = mountRoot;
              } else if (node) {
                node.mounted = mount;
                if (node.mount) {
                  node.mount.mounts.push(mount);
                }
              }
              return mountRoot;
            },
            unmount(mountpoint) {
              var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
              if (!FS.isMountpoint(lookup.node)) {
                throw new FS.ErrnoError(28);
              }
              var node = lookup.node;
              var mount = node.mounted;
              var mounts = FS.getMounts(mount);
              Object.keys(FS.nameTable).forEach((hash) => {
                var current = FS.nameTable[hash];
                while (current) {
                  var next = current.name_next;
                  if (mounts.includes(current.mount)) {
                    FS.destroyNode(current);
                  }
                  current = next;
                }
              });
              node.mounted = null;
              var idx = node.mount.mounts.indexOf(mount);
              assert(idx !== -1);
              node.mount.mounts.splice(idx, 1);
            },
            lookup(parent, name) {
              return parent.node_ops.lookup(parent, name);
            },
            mknod(path, mode, dev) {
              var lookup = FS.lookupPath(path, { parent: true });
              var parent = lookup.node;
              var name = PATH.basename(path);
              if (!name || name === "." || name === "..") {
                throw new FS.ErrnoError(28);
              }
              var errCode = FS.mayCreate(parent, name);
              if (errCode) {
                throw new FS.ErrnoError(errCode);
              }
              if (!parent.node_ops.mknod) {
                throw new FS.ErrnoError(63);
              }
              return parent.node_ops.mknod(parent, name, mode, dev);
            },
            create(path, mode) {
              mode = mode !== void 0 ? mode : 438;
              mode &= 4095;
              mode |= 32768;
              return FS.mknod(path, mode, 0);
            },
            mkdir(path, mode) {
              mode = mode !== void 0 ? mode : 511;
              mode &= 511 | 512;
              mode |= 16384;
              return FS.mknod(path, mode, 0);
            },
            mkdirTree(path, mode) {
              var dirs = path.split("/");
              var d = "";
              for (var i = 0; i < dirs.length; ++i) {
                if (!dirs[i]) continue;
                d += "/" + dirs[i];
                try {
                  FS.mkdir(d, mode);
                } catch (e) {
                  if (e.errno != 20) throw e;
                }
              }
            },
            mkdev(path, mode, dev) {
              if (typeof dev == "undefined") {
                dev = mode;
                mode = 438;
              }
              mode |= 8192;
              return FS.mknod(path, mode, dev);
            },
            symlink(oldpath, newpath) {
              if (!PATH_FS.resolve(oldpath)) {
                throw new FS.ErrnoError(44);
              }
              var lookup = FS.lookupPath(newpath, { parent: true });
              var parent = lookup.node;
              if (!parent) {
                throw new FS.ErrnoError(44);
              }
              var newname = PATH.basename(newpath);
              var errCode = FS.mayCreate(parent, newname);
              if (errCode) {
                throw new FS.ErrnoError(errCode);
              }
              if (!parent.node_ops.symlink) {
                throw new FS.ErrnoError(63);
              }
              return parent.node_ops.symlink(parent, newname, oldpath);
            },
            rename(old_path, new_path) {
              var old_dirname = PATH.dirname(old_path);
              var new_dirname = PATH.dirname(new_path);
              var old_name = PATH.basename(old_path);
              var new_name = PATH.basename(new_path);
              var lookup, old_dir, new_dir;
              lookup = FS.lookupPath(old_path, { parent: true });
              old_dir = lookup.node;
              lookup = FS.lookupPath(new_path, { parent: true });
              new_dir = lookup.node;
              if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
              if (old_dir.mount !== new_dir.mount) {
                throw new FS.ErrnoError(75);
              }
              var old_node = FS.lookupNode(old_dir, old_name);
              var relative = PATH_FS.relative(old_path, new_dirname);
              if (relative.charAt(0) !== ".") {
                throw new FS.ErrnoError(28);
              }
              relative = PATH_FS.relative(new_path, old_dirname);
              if (relative.charAt(0) !== ".") {
                throw new FS.ErrnoError(55);
              }
              var new_node;
              try {
                new_node = FS.lookupNode(new_dir, new_name);
              } catch (e) {
              }
              if (old_node === new_node) {
                return;
              }
              var isdir = FS.isDir(old_node.mode);
              var errCode = FS.mayDelete(old_dir, old_name, isdir);
              if (errCode) {
                throw new FS.ErrnoError(errCode);
              }
              errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
              if (errCode) {
                throw new FS.ErrnoError(errCode);
              }
              if (!old_dir.node_ops.rename) {
                throw new FS.ErrnoError(63);
              }
              if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
                throw new FS.ErrnoError(10);
              }
              if (new_dir !== old_dir) {
                errCode = FS.nodePermissions(old_dir, "w");
                if (errCode) {
                  throw new FS.ErrnoError(errCode);
                }
              }
              FS.hashRemoveNode(old_node);
              try {
                old_dir.node_ops.rename(old_node, new_dir, new_name);
              } catch (e) {
                throw e;
              } finally {
                FS.hashAddNode(old_node);
              }
            },
            rmdir(path) {
              var lookup = FS.lookupPath(path, { parent: true });
              var parent = lookup.node;
              var name = PATH.basename(path);
              var node = FS.lookupNode(parent, name);
              var errCode = FS.mayDelete(parent, name, true);
              if (errCode) {
                throw new FS.ErrnoError(errCode);
              }
              if (!parent.node_ops.rmdir) {
                throw new FS.ErrnoError(63);
              }
              if (FS.isMountpoint(node)) {
                throw new FS.ErrnoError(10);
              }
              parent.node_ops.rmdir(parent, name);
              FS.destroyNode(node);
            },
            readdir(path) {
              var lookup = FS.lookupPath(path, { follow: true });
              var node = lookup.node;
              if (!node.node_ops.readdir) {
                throw new FS.ErrnoError(54);
              }
              return node.node_ops.readdir(node);
            },
            unlink(path) {
              var lookup = FS.lookupPath(path, { parent: true });
              var parent = lookup.node;
              if (!parent) {
                throw new FS.ErrnoError(44);
              }
              var name = PATH.basename(path);
              var node = FS.lookupNode(parent, name);
              var errCode = FS.mayDelete(parent, name, false);
              if (errCode) {
                throw new FS.ErrnoError(errCode);
              }
              if (!parent.node_ops.unlink) {
                throw new FS.ErrnoError(63);
              }
              if (FS.isMountpoint(node)) {
                throw new FS.ErrnoError(10);
              }
              parent.node_ops.unlink(parent, name);
              FS.destroyNode(node);
            },
            readlink(path) {
              var lookup = FS.lookupPath(path);
              var link = lookup.node;
              if (!link) {
                throw new FS.ErrnoError(44);
              }
              if (!link.node_ops.readlink) {
                throw new FS.ErrnoError(28);
              }
              return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
            },
            stat(path, dontFollow) {
              var lookup = FS.lookupPath(path, { follow: !dontFollow });
              var node = lookup.node;
              if (!node) {
                throw new FS.ErrnoError(44);
              }
              if (!node.node_ops.getattr) {
                throw new FS.ErrnoError(63);
              }
              return node.node_ops.getattr(node);
            },
            lstat(path) {
              return FS.stat(path, true);
            },
            chmod(path, mode, dontFollow) {
              var node;
              if (typeof path == "string") {
                var lookup = FS.lookupPath(path, { follow: !dontFollow });
                node = lookup.node;
              } else {
                node = path;
              }
              if (!node.node_ops.setattr) {
                throw new FS.ErrnoError(63);
              }
              node.node_ops.setattr(node, {
                mode: mode & 4095 | node.mode & ~4095,
                timestamp: Date.now()
              });
            },
            lchmod(path, mode) {
              FS.chmod(path, mode, true);
            },
            fchmod(fd, mode) {
              var stream = FS.getStreamChecked(fd);
              FS.chmod(stream.node, mode);
            },
            chown(path, uid, gid, dontFollow) {
              var node;
              if (typeof path == "string") {
                var lookup = FS.lookupPath(path, { follow: !dontFollow });
                node = lookup.node;
              } else {
                node = path;
              }
              if (!node.node_ops.setattr) {
                throw new FS.ErrnoError(63);
              }
              node.node_ops.setattr(node, {
                timestamp: Date.now()
                // we ignore the uid / gid for now
              });
            },
            lchown(path, uid, gid) {
              FS.chown(path, uid, gid, true);
            },
            fchown(fd, uid, gid) {
              var stream = FS.getStreamChecked(fd);
              FS.chown(stream.node, uid, gid);
            },
            truncate(path, len) {
              if (len < 0) {
                throw new FS.ErrnoError(28);
              }
              var node;
              if (typeof path == "string") {
                var lookup = FS.lookupPath(path, { follow: true });
                node = lookup.node;
              } else {
                node = path;
              }
              if (!node.node_ops.setattr) {
                throw new FS.ErrnoError(63);
              }
              if (FS.isDir(node.mode)) {
                throw new FS.ErrnoError(31);
              }
              if (!FS.isFile(node.mode)) {
                throw new FS.ErrnoError(28);
              }
              var errCode = FS.nodePermissions(node, "w");
              if (errCode) {
                throw new FS.ErrnoError(errCode);
              }
              node.node_ops.setattr(node, {
                size: len,
                timestamp: Date.now()
              });
            },
            ftruncate(fd, len) {
              var stream = FS.getStreamChecked(fd);
              if ((stream.flags & 2097155) === 0) {
                throw new FS.ErrnoError(28);
              }
              FS.truncate(stream.node, len);
            },
            utime(path, atime, mtime) {
              var lookup = FS.lookupPath(path, { follow: true });
              var node = lookup.node;
              node.node_ops.setattr(node, {
                timestamp: Math.max(atime, mtime)
              });
            },
            open(path, flags, mode) {
              if (path === "") {
                throw new FS.ErrnoError(44);
              }
              flags = typeof flags == "string" ? FS_modeStringToFlags(flags) : flags;
              mode = typeof mode == "undefined" ? 438 : mode;
              if (flags & 64) {
                mode = mode & 4095 | 32768;
              } else {
                mode = 0;
              }
              var node;
              if (typeof path == "object") {
                node = path;
              } else {
                path = PATH.normalize(path);
                try {
                  var lookup = FS.lookupPath(path, {
                    follow: !(flags & 131072)
                  });
                  node = lookup.node;
                } catch (e) {
                }
              }
              var created = false;
              if (flags & 64) {
                if (node) {
                  if (flags & 128) {
                    throw new FS.ErrnoError(20);
                  }
                } else {
                  node = FS.mknod(path, mode, 0);
                  created = true;
                }
              }
              if (!node) {
                throw new FS.ErrnoError(44);
              }
              if (FS.isChrdev(node.mode)) {
                flags &= ~512;
              }
              if (flags & 65536 && !FS.isDir(node.mode)) {
                throw new FS.ErrnoError(54);
              }
              if (!created) {
                var errCode = FS.mayOpen(node, flags);
                if (errCode) {
                  throw new FS.ErrnoError(errCode);
                }
              }
              if (flags & 512 && !created) {
                FS.truncate(node, 0);
              }
              flags &= ~(128 | 512 | 131072);
              var stream = FS.createStream({
                node,
                path: FS.getPath(node),
                // we want the absolute path to the node
                flags,
                seekable: true,
                position: 0,
                stream_ops: node.stream_ops,
                // used by the file family libc calls (fopen, fwrite, ferror, etc.)
                ungotten: [],
                error: false
              });
              if (stream.stream_ops.open) {
                stream.stream_ops.open(stream);
              }
              if (Module2["logReadFiles"] && !(flags & 1)) {
                if (!FS.readFiles) FS.readFiles = {};
                if (!(path in FS.readFiles)) {
                  FS.readFiles[path] = 1;
                }
              }
              return stream;
            },
            close(stream) {
              if (FS.isClosed(stream)) {
                throw new FS.ErrnoError(8);
              }
              if (stream.getdents) stream.getdents = null;
              try {
                if (stream.stream_ops.close) {
                  stream.stream_ops.close(stream);
                }
              } catch (e) {
                throw e;
              } finally {
                FS.closeStream(stream.fd);
              }
              stream.fd = null;
            },
            isClosed(stream) {
              return stream.fd === null;
            },
            llseek(stream, offset, whence) {
              if (FS.isClosed(stream)) {
                throw new FS.ErrnoError(8);
              }
              if (!stream.seekable || !stream.stream_ops.llseek) {
                throw new FS.ErrnoError(70);
              }
              if (whence != 0 && whence != 1 && whence != 2) {
                throw new FS.ErrnoError(28);
              }
              stream.position = stream.stream_ops.llseek(stream, offset, whence);
              stream.ungotten = [];
              return stream.position;
            },
            read(stream, buffer, offset, length, position) {
              assert(offset >= 0);
              if (length < 0 || position < 0) {
                throw new FS.ErrnoError(28);
              }
              if (FS.isClosed(stream)) {
                throw new FS.ErrnoError(8);
              }
              if ((stream.flags & 2097155) === 1) {
                throw new FS.ErrnoError(8);
              }
              if (FS.isDir(stream.node.mode)) {
                throw new FS.ErrnoError(31);
              }
              if (!stream.stream_ops.read) {
                throw new FS.ErrnoError(28);
              }
              var seeking = typeof position != "undefined";
              if (!seeking) {
                position = stream.position;
              } else if (!stream.seekable) {
                throw new FS.ErrnoError(70);
              }
              var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
              if (!seeking) stream.position += bytesRead;
              return bytesRead;
            },
            write(stream, buffer, offset, length, position, canOwn) {
              assert(offset >= 0);
              if (length < 0 || position < 0) {
                throw new FS.ErrnoError(28);
              }
              if (FS.isClosed(stream)) {
                throw new FS.ErrnoError(8);
              }
              if ((stream.flags & 2097155) === 0) {
                throw new FS.ErrnoError(8);
              }
              if (FS.isDir(stream.node.mode)) {
                throw new FS.ErrnoError(31);
              }
              if (!stream.stream_ops.write) {
                throw new FS.ErrnoError(28);
              }
              if (stream.seekable && stream.flags & 1024) {
                FS.llseek(stream, 0, 2);
              }
              var seeking = typeof position != "undefined";
              if (!seeking) {
                position = stream.position;
              } else if (!stream.seekable) {
                throw new FS.ErrnoError(70);
              }
              var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
              if (!seeking) stream.position += bytesWritten;
              return bytesWritten;
            },
            allocate(stream, offset, length) {
              if (FS.isClosed(stream)) {
                throw new FS.ErrnoError(8);
              }
              if (offset < 0 || length <= 0) {
                throw new FS.ErrnoError(28);
              }
              if ((stream.flags & 2097155) === 0) {
                throw new FS.ErrnoError(8);
              }
              if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
                throw new FS.ErrnoError(43);
              }
              if (!stream.stream_ops.allocate) {
                throw new FS.ErrnoError(138);
              }
              stream.stream_ops.allocate(stream, offset, length);
            },
            mmap(stream, length, position, prot, flags) {
              if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
                throw new FS.ErrnoError(2);
              }
              if ((stream.flags & 2097155) === 1) {
                throw new FS.ErrnoError(2);
              }
              if (!stream.stream_ops.mmap) {
                throw new FS.ErrnoError(43);
              }
              return stream.stream_ops.mmap(stream, length, position, prot, flags);
            },
            msync(stream, buffer, offset, length, mmapFlags) {
              assert(offset >= 0);
              if (!stream.stream_ops.msync) {
                return 0;
              }
              return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
            },
            munmap: (stream) => 0,
            ioctl(stream, cmd, arg) {
              if (!stream.stream_ops.ioctl) {
                throw new FS.ErrnoError(59);
              }
              return stream.stream_ops.ioctl(stream, cmd, arg);
            },
            readFile(path, opts = {}) {
              opts.flags = opts.flags || 0;
              opts.encoding = opts.encoding || "binary";
              if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
                throw new Error(`Invalid encoding type "${opts.encoding}"`);
              }
              var ret;
              var stream = FS.open(path, opts.flags);
              var stat = FS.stat(path);
              var length = stat.size;
              var buf = new Uint8Array(length);
              FS.read(stream, buf, 0, length, 0);
              if (opts.encoding === "utf8") {
                ret = UTF8ArrayToString(buf, 0);
              } else if (opts.encoding === "binary") {
                ret = buf;
              }
              FS.close(stream);
              return ret;
            },
            writeFile(path, data, opts = {}) {
              opts.flags = opts.flags || 577;
              var stream = FS.open(path, opts.flags, opts.mode);
              if (typeof data == "string") {
                var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
                var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
                FS.write(stream, buf, 0, actualNumBytes, void 0, opts.canOwn);
              } else if (ArrayBuffer.isView(data)) {
                FS.write(stream, data, 0, data.byteLength, void 0, opts.canOwn);
              } else {
                throw new Error("Unsupported data type");
              }
              FS.close(stream);
            },
            cwd: () => FS.currentPath,
            chdir(path) {
              var lookup = FS.lookupPath(path, { follow: true });
              if (lookup.node === null) {
                throw new FS.ErrnoError(44);
              }
              if (!FS.isDir(lookup.node.mode)) {
                throw new FS.ErrnoError(54);
              }
              var errCode = FS.nodePermissions(lookup.node, "x");
              if (errCode) {
                throw new FS.ErrnoError(errCode);
              }
              FS.currentPath = lookup.path;
            },
            createDefaultDirectories() {
              FS.mkdir("/tmp");
              FS.mkdir("/home");
              FS.mkdir("/home/web_user");
            },
            createDefaultDevices() {
              FS.mkdir("/dev");
              FS.registerDevice(FS.makedev(1, 3), {
                read: () => 0,
                write: (stream, buffer, offset, length, pos) => length
              });
              FS.mkdev("/dev/null", FS.makedev(1, 3));
              TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
              TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
              FS.mkdev("/dev/tty", FS.makedev(5, 0));
              FS.mkdev("/dev/tty1", FS.makedev(6, 0));
              var randomBuffer = new Uint8Array(1024), randomLeft = 0;
              var randomByte = () => {
                if (randomLeft === 0) {
                  randomLeft = randomFill(randomBuffer).byteLength;
                }
                return randomBuffer[--randomLeft];
              };
              FS.createDevice("/dev", "random", randomByte);
              FS.createDevice("/dev", "urandom", randomByte);
              FS.mkdir("/dev/shm");
              FS.mkdir("/dev/shm/tmp");
            },
            createSpecialDirectories() {
              FS.mkdir("/proc");
              var proc_self = FS.mkdir("/proc/self");
              FS.mkdir("/proc/self/fd");
              FS.mount({
                mount() {
                  var node = FS.createNode(proc_self, "fd", 16384 | 511, 73);
                  node.node_ops = {
                    lookup(parent, name) {
                      var fd = +name;
                      var stream = FS.getStreamChecked(fd);
                      var ret = {
                        parent: null,
                        mount: { mountpoint: "fake" },
                        node_ops: { readlink: () => stream.path }
                      };
                      ret.parent = ret;
                      return ret;
                    }
                  };
                  return node;
                }
              }, {}, "/proc/self/fd");
            },
            createStandardStreams() {
              if (Module2["stdin"]) {
                FS.createDevice("/dev", "stdin", Module2["stdin"]);
              } else {
                FS.symlink("/dev/tty", "/dev/stdin");
              }
              if (Module2["stdout"]) {
                FS.createDevice("/dev", "stdout", null, Module2["stdout"]);
              } else {
                FS.symlink("/dev/tty", "/dev/stdout");
              }
              if (Module2["stderr"]) {
                FS.createDevice("/dev", "stderr", null, Module2["stderr"]);
              } else {
                FS.symlink("/dev/tty1", "/dev/stderr");
              }
              var stdin = FS.open("/dev/stdin", 0);
              var stdout = FS.open("/dev/stdout", 1);
              var stderr = FS.open("/dev/stderr", 1);
              assert(stdin.fd === 0, `invalid handle for stdin (${stdin.fd})`);
              assert(stdout.fd === 1, `invalid handle for stdout (${stdout.fd})`);
              assert(stderr.fd === 2, `invalid handle for stderr (${stderr.fd})`);
            },
            ensureErrnoError() {
              if (FS.ErrnoError) return;
              FS.ErrnoError = /** @this{Object} */
              function ErrnoError(errno, node) {
                this.name = "ErrnoError";
                this.node = node;
                this.setErrno = /** @this{Object} */
                function(errno2) {
                  this.errno = errno2;
                  for (var key in ERRNO_CODES) {
                    if (ERRNO_CODES[key] === errno2) {
                      this.code = key;
                      break;
                    }
                  }
                };
                this.setErrno(errno);
                this.message = ERRNO_MESSAGES[errno];
                if (this.stack) {
                  Object.defineProperty(this, "stack", { value: new Error().stack, writable: true });
                  this.stack = demangleAll(this.stack);
                }
              };
              FS.ErrnoError.prototype = new Error();
              FS.ErrnoError.prototype.constructor = FS.ErrnoError;
              [44].forEach((code) => {
                FS.genericErrors[code] = new FS.ErrnoError(code);
                FS.genericErrors[code].stack = "<generic error, no stack>";
              });
            },
            staticInit() {
              FS.ensureErrnoError();
              FS.nameTable = new Array(4096);
              FS.mount(MEMFS, {}, "/");
              FS.createDefaultDirectories();
              FS.createDefaultDevices();
              FS.createSpecialDirectories();
              FS.filesystems = {
                "MEMFS": MEMFS
              };
            },
            init(input, output, error) {
              assert(!FS.init.initialized, "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");
              FS.init.initialized = true;
              FS.ensureErrnoError();
              Module2["stdin"] = input || Module2["stdin"];
              Module2["stdout"] = output || Module2["stdout"];
              Module2["stderr"] = error || Module2["stderr"];
              FS.createStandardStreams();
            },
            quit() {
              FS.init.initialized = false;
              _fflush(0);
              for (var i = 0; i < FS.streams.length; i++) {
                var stream = FS.streams[i];
                if (!stream) {
                  continue;
                }
                FS.close(stream);
              }
            },
            findObject(path, dontResolveLastLink) {
              var ret = FS.analyzePath(path, dontResolveLastLink);
              if (!ret.exists) {
                return null;
              }
              return ret.object;
            },
            analyzePath(path, dontResolveLastLink) {
              try {
                var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
                path = lookup.path;
              } catch (e) {
              }
              var ret = {
                isRoot: false,
                exists: false,
                error: 0,
                name: null,
                path: null,
                object: null,
                parentExists: false,
                parentPath: null,
                parentObject: null
              };
              try {
                var lookup = FS.lookupPath(path, { parent: true });
                ret.parentExists = true;
                ret.parentPath = lookup.path;
                ret.parentObject = lookup.node;
                ret.name = PATH.basename(path);
                lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
                ret.exists = true;
                ret.path = lookup.path;
                ret.object = lookup.node;
                ret.name = lookup.node.name;
                ret.isRoot = lookup.path === "/";
              } catch (e) {
                ret.error = e.errno;
              }
              ;
              return ret;
            },
            createPath(parent, path, canRead, canWrite) {
              parent = typeof parent == "string" ? parent : FS.getPath(parent);
              var parts = path.split("/").reverse();
              while (parts.length) {
                var part = parts.pop();
                if (!part) continue;
                var current = PATH.join2(parent, part);
                try {
                  FS.mkdir(current);
                } catch (e) {
                }
                parent = current;
              }
              return current;
            },
            createFile(parent, name, properties, canRead, canWrite) {
              var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
              var mode = FS_getMode(canRead, canWrite);
              return FS.create(path, mode);
            },
            createDataFile(parent, name, data, canRead, canWrite, canOwn) {
              var path = name;
              if (parent) {
                parent = typeof parent == "string" ? parent : FS.getPath(parent);
                path = name ? PATH.join2(parent, name) : parent;
              }
              var mode = FS_getMode(canRead, canWrite);
              var node = FS.create(path, mode);
              if (data) {
                if (typeof data == "string") {
                  var arr = new Array(data.length);
                  for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
                  data = arr;
                }
                FS.chmod(node, mode | 146);
                var stream = FS.open(node, 577);
                FS.write(stream, data, 0, data.length, 0, canOwn);
                FS.close(stream);
                FS.chmod(node, mode);
              }
            },
            createDevice(parent, name, input, output) {
              var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
              var mode = FS_getMode(!!input, !!output);
              if (!FS.createDevice.major) FS.createDevice.major = 64;
              var dev = FS.makedev(FS.createDevice.major++, 0);
              FS.registerDevice(dev, {
                open(stream) {
                  stream.seekable = false;
                },
                close(stream) {
                  if (output && output.buffer && output.buffer.length) {
                    output(10);
                  }
                },
                read(stream, buffer, offset, length, pos) {
                  var bytesRead = 0;
                  for (var i = 0; i < length; i++) {
                    var result;
                    try {
                      result = input();
                    } catch (e) {
                      throw new FS.ErrnoError(29);
                    }
                    if (result === void 0 && bytesRead === 0) {
                      throw new FS.ErrnoError(6);
                    }
                    if (result === null || result === void 0) break;
                    bytesRead++;
                    buffer[offset + i] = result;
                  }
                  if (bytesRead) {
                    stream.node.timestamp = Date.now();
                  }
                  return bytesRead;
                },
                write(stream, buffer, offset, length, pos) {
                  for (var i = 0; i < length; i++) {
                    try {
                      output(buffer[offset + i]);
                    } catch (e) {
                      throw new FS.ErrnoError(29);
                    }
                  }
                  if (length) {
                    stream.node.timestamp = Date.now();
                  }
                  return i;
                }
              });
              return FS.mkdev(path, mode, dev);
            },
            forceLoadFile(obj) {
              if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
              if (typeof XMLHttpRequest != "undefined") {
                throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
              } else if (read_) {
                try {
                  obj.contents = intArrayFromString(read_(obj.url), true);
                  obj.usedBytes = obj.contents.length;
                } catch (e) {
                  throw new FS.ErrnoError(29);
                }
              } else {
                throw new Error("Cannot load without read() or XMLHttpRequest.");
              }
            },
            createLazyFile(parent, name, url, canRead, canWrite) {
              function LazyUint8Array() {
                this.lengthKnown = false;
                this.chunks = [];
              }
              LazyUint8Array.prototype.get = /** @this{Object} */
              function LazyUint8Array_get(idx) {
                if (idx > this.length - 1 || idx < 0) {
                  return void 0;
                }
                var chunkOffset = idx % this.chunkSize;
                var chunkNum = idx / this.chunkSize | 0;
                return this.getter(chunkNum)[chunkOffset];
              };
              LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
                this.getter = getter;
              };
              LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
                var xhr = new XMLHttpRequest();
                xhr.open("HEAD", url, false);
                xhr.send(null);
                if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
                var datalength = Number(xhr.getResponseHeader("Content-length"));
                var header;
                var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
                var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
                var chunkSize = 1024 * 1024;
                if (!hasByteServing) chunkSize = datalength;
                var doXHR = (from, to) => {
                  if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
                  if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
                  var xhr2 = new XMLHttpRequest();
                  xhr2.open("GET", url, false);
                  if (datalength !== chunkSize) xhr2.setRequestHeader("Range", "bytes=" + from + "-" + to);
                  xhr2.responseType = "arraybuffer";
                  if (xhr2.overrideMimeType) {
                    xhr2.overrideMimeType("text/plain; charset=x-user-defined");
                  }
                  xhr2.send(null);
                  if (!(xhr2.status >= 200 && xhr2.status < 300 || xhr2.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr2.status);
                  if (xhr2.response !== void 0) {
                    return new Uint8Array(
                      /** @type{Array<number>} */
                      xhr2.response || []
                    );
                  }
                  return intArrayFromString(xhr2.responseText || "", true);
                };
                var lazyArray2 = this;
                lazyArray2.setDataGetter((chunkNum) => {
                  var start = chunkNum * chunkSize;
                  var end = (chunkNum + 1) * chunkSize - 1;
                  end = Math.min(end, datalength - 1);
                  if (typeof lazyArray2.chunks[chunkNum] == "undefined") {
                    lazyArray2.chunks[chunkNum] = doXHR(start, end);
                  }
                  if (typeof lazyArray2.chunks[chunkNum] == "undefined") throw new Error("doXHR failed!");
                  return lazyArray2.chunks[chunkNum];
                });
                if (usesGzip || !datalength) {
                  chunkSize = datalength = 1;
                  datalength = this.getter(0).length;
                  chunkSize = datalength;
                  out("LazyFiles on gzip forces download of the whole file when length is accessed");
                }
                this._length = datalength;
                this._chunkSize = chunkSize;
                this.lengthKnown = true;
              };
              if (typeof XMLHttpRequest != "undefined") {
                if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
                var lazyArray = new LazyUint8Array();
                Object.defineProperties(lazyArray, {
                  length: {
                    get: (
                      /** @this{Object} */
                      function() {
                        if (!this.lengthKnown) {
                          this.cacheLength();
                        }
                        return this._length;
                      }
                    )
                  },
                  chunkSize: {
                    get: (
                      /** @this{Object} */
                      function() {
                        if (!this.lengthKnown) {
                          this.cacheLength();
                        }
                        return this._chunkSize;
                      }
                    )
                  }
                });
                var properties = { isDevice: false, contents: lazyArray };
              } else {
                var properties = { isDevice: false, url };
              }
              var node = FS.createFile(parent, name, properties, canRead, canWrite);
              if (properties.contents) {
                node.contents = properties.contents;
              } else if (properties.url) {
                node.contents = null;
                node.url = properties.url;
              }
              Object.defineProperties(node, {
                usedBytes: {
                  get: (
                    /** @this {FSNode} */
                    function() {
                      return this.contents.length;
                    }
                  )
                }
              });
              var stream_ops = {};
              var keys = Object.keys(node.stream_ops);
              keys.forEach((key) => {
                var fn = node.stream_ops[key];
                stream_ops[key] = function forceLoadLazyFile() {
                  FS.forceLoadFile(node);
                  return fn.apply(null, arguments);
                };
              });
              function writeChunks(stream, buffer, offset, length, position) {
                var contents = stream.node.contents;
                if (position >= contents.length)
                  return 0;
                var size = Math.min(contents.length - position, length);
                assert(size >= 0);
                if (contents.slice) {
                  for (var i = 0; i < size; i++) {
                    buffer[offset + i] = contents[position + i];
                  }
                } else {
                  for (var i = 0; i < size; i++) {
                    buffer[offset + i] = contents.get(position + i);
                  }
                }
                return size;
              }
              stream_ops.read = (stream, buffer, offset, length, position) => {
                FS.forceLoadFile(node);
                return writeChunks(stream, buffer, offset, length, position);
              };
              stream_ops.mmap = (stream, length, position, prot, flags) => {
                FS.forceLoadFile(node);
                var ptr = mmapAlloc(length);
                if (!ptr) {
                  throw new FS.ErrnoError(48);
                }
                writeChunks(stream, HEAP8, ptr, length, position);
                return { ptr, allocated: true };
              };
              node.stream_ops = stream_ops;
              return node;
            },
            absolutePath() {
              abort("FS.absolutePath has been removed; use PATH_FS.resolve instead");
            },
            createFolder() {
              abort("FS.createFolder has been removed; use FS.mkdir instead");
            },
            createLink() {
              abort("FS.createLink has been removed; use FS.symlink instead");
            },
            joinPath() {
              abort("FS.joinPath has been removed; use PATH.join instead");
            },
            mmapAlloc() {
              abort("FS.mmapAlloc has been replaced by the top level function mmapAlloc");
            },
            standardizePath() {
              abort("FS.standardizePath has been removed; use PATH.normalize instead");
            }
          };
          var SYSCALLS = {
            DEFAULT_POLLMASK: 5,
            calculateAt(dirfd, path, allowEmpty) {
              if (PATH.isAbs(path)) {
                return path;
              }
              var dir;
              if (dirfd === -100) {
                dir = FS.cwd();
              } else {
                var dirstream = SYSCALLS.getStreamFromFD(dirfd);
                dir = dirstream.path;
              }
              if (path.length == 0) {
                if (!allowEmpty) {
                  throw new FS.ErrnoError(44);
                  ;
                }
                return dir;
              }
              return PATH.join2(dir, path);
            },
            doStat(func, path, buf) {
              try {
                var stat = func(path);
              } catch (e) {
                if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
                  return -54;
                }
                throw e;
              }
              HEAP32[buf >> 2] = stat.dev;
              HEAP32[buf + 4 >> 2] = stat.mode;
              HEAPU32[buf + 8 >> 2] = stat.nlink;
              HEAP32[buf + 12 >> 2] = stat.uid;
              HEAP32[buf + 16 >> 2] = stat.gid;
              HEAP32[buf + 20 >> 2] = stat.rdev;
              tempI64 = [stat.size >>> 0, (tempDouble = stat.size, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 24 >> 2] = tempI64[0], HEAP32[buf + 28 >> 2] = tempI64[1];
              HEAP32[buf + 32 >> 2] = 4096;
              HEAP32[buf + 36 >> 2] = stat.blocks;
              var atime = stat.atime.getTime();
              var mtime = stat.mtime.getTime();
              var ctime = stat.ctime.getTime();
              tempI64 = [Math.floor(atime / 1e3) >>> 0, (tempDouble = Math.floor(atime / 1e3), +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 40 >> 2] = tempI64[0], HEAP32[buf + 44 >> 2] = tempI64[1];
              HEAPU32[buf + 48 >> 2] = atime % 1e3 * 1e3;
              tempI64 = [Math.floor(mtime / 1e3) >>> 0, (tempDouble = Math.floor(mtime / 1e3), +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 56 >> 2] = tempI64[0], HEAP32[buf + 60 >> 2] = tempI64[1];
              HEAPU32[buf + 64 >> 2] = mtime % 1e3 * 1e3;
              tempI64 = [Math.floor(ctime / 1e3) >>> 0, (tempDouble = Math.floor(ctime / 1e3), +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 72 >> 2] = tempI64[0], HEAP32[buf + 76 >> 2] = tempI64[1];
              HEAPU32[buf + 80 >> 2] = ctime % 1e3 * 1e3;
              tempI64 = [stat.ino >>> 0, (tempDouble = stat.ino, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 88 >> 2] = tempI64[0], HEAP32[buf + 92 >> 2] = tempI64[1];
              return 0;
            },
            doMsync(addr, stream, len, flags, offset) {
              if (!FS.isFile(stream.node.mode)) {
                throw new FS.ErrnoError(43);
              }
              if (flags & 2) {
                return 0;
              }
              var buffer = HEAPU8.slice(addr, addr + len);
              FS.msync(stream, buffer, offset, len, flags);
            },
            varargs: void 0,
            get() {
              assert(SYSCALLS.varargs != void 0);
              var ret = HEAP32[+SYSCALLS.varargs >> 2];
              SYSCALLS.varargs += 4;
              return ret;
            },
            getp() {
              return SYSCALLS.get();
            },
            getStr(ptr) {
              var ret = UTF8ToString(ptr);
              return ret;
            },
            getStreamFromFD(fd) {
              var stream = FS.getStreamChecked(fd);
              return stream;
            }
          };
          function ___syscall_fcntl64(fd, cmd, varargs) {
            SYSCALLS.varargs = varargs;
            try {
              var stream = SYSCALLS.getStreamFromFD(fd);
              switch (cmd) {
                case 0: {
                  var arg = SYSCALLS.get();
                  if (arg < 0) {
                    return -28;
                  }
                  while (FS.streams[arg]) {
                    arg++;
                  }
                  var newStream;
                  newStream = FS.createStream(stream, arg);
                  return newStream.fd;
                }
                case 1:
                case 2:
                  return 0;
                // FD_CLOEXEC makes no sense for a single process.
                case 3:
                  return stream.flags;
                case 4: {
                  var arg = SYSCALLS.get();
                  stream.flags |= arg;
                  return 0;
                }
                case 5: {
                  var arg = SYSCALLS.getp();
                  var offset = 0;
                  HEAP16[arg + offset >> 1] = 2;
                  return 0;
                }
                case 6:
                case 7:
                  return 0;
                // Pretend that the locking is successful.
                case 16:
                case 8:
                  return -28;
                // These are for sockets. We don't have them fully implemented yet.
                case 9:
                  setErrNo(28);
                  return -1;
                default: {
                  return -28;
                }
              }
            } catch (e) {
              if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
              return -e.errno;
            }
          }
          function ___syscall_fstat64(fd, buf) {
            try {
              var stream = SYSCALLS.getStreamFromFD(fd);
              return SYSCALLS.doStat(FS.stat, stream.path, buf);
            } catch (e) {
              if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
              return -e.errno;
            }
          }
          var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
            assert(typeof maxBytesToWrite == "number", "stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");
            return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
          };
          function ___syscall_getdents64(fd, dirp, count) {
            try {
              var stream = SYSCALLS.getStreamFromFD(fd);
              if (!stream.getdents) {
                stream.getdents = FS.readdir(stream.path);
              }
              var struct_size = 280;
              var pos = 0;
              var off = FS.llseek(stream, 0, 1);
              var idx = Math.floor(off / struct_size);
              while (idx < stream.getdents.length && pos + struct_size <= count) {
                var id;
                var type;
                var name = stream.getdents[idx];
                if (name === ".") {
                  id = stream.node.id;
                  type = 4;
                } else if (name === "..") {
                  var lookup = FS.lookupPath(stream.path, { parent: true });
                  id = lookup.node.id;
                  type = 4;
                } else {
                  var child = FS.lookupNode(stream.node, name);
                  id = child.id;
                  type = FS.isChrdev(child.mode) ? 2 : (
                    // DT_CHR, character device.
                    FS.isDir(child.mode) ? 4 : (
                      // DT_DIR, directory.
                      FS.isLink(child.mode) ? 10 : (
                        // DT_LNK, symbolic link.
                        8
                      )
                    )
                  );
                }
                assert(id);
                tempI64 = [id >>> 0, (tempDouble = id, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[dirp + pos >> 2] = tempI64[0], HEAP32[dirp + pos + 4 >> 2] = tempI64[1];
                tempI64 = [(idx + 1) * struct_size >>> 0, (tempDouble = (idx + 1) * struct_size, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[dirp + pos + 8 >> 2] = tempI64[0], HEAP32[dirp + pos + 12 >> 2] = tempI64[1];
                HEAP16[dirp + pos + 16 >> 1] = 280;
                HEAP8[dirp + pos + 18 >> 0] = type;
                stringToUTF8(name, dirp + pos + 19, 256);
                pos += struct_size;
                idx += 1;
              }
              FS.llseek(stream, idx * struct_size, 0);
              return pos;
            } catch (e) {
              if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
              return -e.errno;
            }
          }
          function ___syscall_ioctl(fd, op, varargs) {
            SYSCALLS.varargs = varargs;
            try {
              var stream = SYSCALLS.getStreamFromFD(fd);
              switch (op) {
                case 21509: {
                  if (!stream.tty) return -59;
                  return 0;
                }
                case 21505: {
                  if (!stream.tty) return -59;
                  if (stream.tty.ops.ioctl_tcgets) {
                    var termios = stream.tty.ops.ioctl_tcgets(stream);
                    var argp = SYSCALLS.getp();
                    HEAP32[argp >> 2] = termios.c_iflag || 0;
                    HEAP32[argp + 4 >> 2] = termios.c_oflag || 0;
                    HEAP32[argp + 8 >> 2] = termios.c_cflag || 0;
                    HEAP32[argp + 12 >> 2] = termios.c_lflag || 0;
                    for (var i = 0; i < 32; i++) {
                      HEAP8[argp + i + 17 >> 0] = termios.c_cc[i] || 0;
                    }
                    return 0;
                  }
                  return 0;
                }
                case 21510:
                case 21511:
                case 21512: {
                  if (!stream.tty) return -59;
                  return 0;
                }
                case 21506:
                case 21507:
                case 21508: {
                  if (!stream.tty) return -59;
                  if (stream.tty.ops.ioctl_tcsets) {
                    var argp = SYSCALLS.getp();
                    var c_iflag = HEAP32[argp >> 2];
                    var c_oflag = HEAP32[argp + 4 >> 2];
                    var c_cflag = HEAP32[argp + 8 >> 2];
                    var c_lflag = HEAP32[argp + 12 >> 2];
                    var c_cc = [];
                    for (var i = 0; i < 32; i++) {
                      c_cc.push(HEAP8[argp + i + 17 >> 0]);
                    }
                    return stream.tty.ops.ioctl_tcsets(stream.tty, op, { c_iflag, c_oflag, c_cflag, c_lflag, c_cc });
                  }
                  return 0;
                }
                case 21519: {
                  if (!stream.tty) return -59;
                  var argp = SYSCALLS.getp();
                  HEAP32[argp >> 2] = 0;
                  return 0;
                }
                case 21520: {
                  if (!stream.tty) return -59;
                  return -28;
                }
                case 21531: {
                  var argp = SYSCALLS.getp();
                  return FS.ioctl(stream, op, argp);
                }
                case 21523: {
                  if (!stream.tty) return -59;
                  if (stream.tty.ops.ioctl_tiocgwinsz) {
                    var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
                    var argp = SYSCALLS.getp();
                    HEAP16[argp >> 1] = winsize[0];
                    HEAP16[argp + 2 >> 1] = winsize[1];
                  }
                  return 0;
                }
                case 21524: {
                  if (!stream.tty) return -59;
                  return 0;
                }
                case 21515: {
                  if (!stream.tty) return -59;
                  return 0;
                }
                default:
                  return -28;
              }
            } catch (e) {
              if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
              return -e.errno;
            }
          }
          function ___syscall_lstat64(path, buf) {
            try {
              path = SYSCALLS.getStr(path);
              return SYSCALLS.doStat(FS.lstat, path, buf);
            } catch (e) {
              if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
              return -e.errno;
            }
          }
          function ___syscall_newfstatat(dirfd, path, buf, flags) {
            try {
              path = SYSCALLS.getStr(path);
              var nofollow = flags & 256;
              var allowEmpty = flags & 4096;
              flags = flags & ~6400;
              assert(!flags, `unknown flags in __syscall_newfstatat: ${flags}`);
              path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
              return SYSCALLS.doStat(nofollow ? FS.lstat : FS.stat, path, buf);
            } catch (e) {
              if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
              return -e.errno;
            }
          }
          function ___syscall_openat(dirfd, path, flags, varargs) {
            SYSCALLS.varargs = varargs;
            try {
              path = SYSCALLS.getStr(path);
              path = SYSCALLS.calculateAt(dirfd, path);
              var mode = varargs ? SYSCALLS.get() : 0;
              return FS.open(path, flags, mode).fd;
            } catch (e) {
              if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
              return -e.errno;
            }
          }
          function ___syscall_rmdir(path) {
            try {
              path = SYSCALLS.getStr(path);
              FS.rmdir(path);
              return 0;
            } catch (e) {
              if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
              return -e.errno;
            }
          }
          function ___syscall_stat64(path, buf) {
            try {
              path = SYSCALLS.getStr(path);
              return SYSCALLS.doStat(FS.stat, path, buf);
            } catch (e) {
              if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
              return -e.errno;
            }
          }
          function ___syscall_unlinkat(dirfd, path, flags) {
            try {
              path = SYSCALLS.getStr(path);
              path = SYSCALLS.calculateAt(dirfd, path);
              if (flags === 0) {
                FS.unlink(path);
              } else if (flags === 512) {
                FS.rmdir(path);
              } else {
                abort("Invalid flags passed to unlinkat");
              }
              return 0;
            } catch (e) {
              if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
              return -e.errno;
            }
          }
          var __emscripten_fs_load_embedded_files = (ptr) => {
            do {
              var name_addr = HEAPU32[ptr >> 2];
              ptr += 4;
              var len = HEAPU32[ptr >> 2];
              ptr += 4;
              var content = HEAPU32[ptr >> 2];
              ptr += 4;
              var name = UTF8ToString(name_addr);
              FS.createPath("/", PATH.dirname(name), true, true);
              FS.createDataFile(name, null, HEAP8.subarray(content, content + len), true, true, true);
            } while (HEAPU32[ptr >> 2]);
          };
          var nowIsMonotonic = 1;
          var __emscripten_get_now_is_monotonic = () => nowIsMonotonic;
          var _emscripten_date_now = () => Date.now();
          var _emscripten_get_now;
          _emscripten_get_now = () => performance.now();
          ;
          var _emscripten_memcpy_js = (dest, src, num) => HEAPU8.copyWithin(dest, src, src + num);
          var getHeapMax = () => HEAPU8.length;
          var abortOnCannotGrowMemory = (requestedSize) => {
            abort(`Cannot enlarge memory arrays to size ${requestedSize} bytes (OOM). Either (1) compile with -sINITIAL_MEMORY=X with X higher than the current value ${HEAP8.length}, (2) compile with -sALLOW_MEMORY_GROWTH which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with -sABORTING_MALLOC=0`);
          };
          var _emscripten_resize_heap = (requestedSize) => {
            var oldSize = HEAPU8.length;
            requestedSize >>>= 0;
            abortOnCannotGrowMemory(requestedSize);
          };
          var ENV = {};
          var getExecutableName = () => {
            return thisProgram || "./this.program";
          };
          var getEnvStrings = () => {
            if (!getEnvStrings.strings) {
              var lang = (typeof navigator == "object" && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8";
              var env = {
                "USER": "web_user",
                "LOGNAME": "web_user",
                "PATH": "/",
                "PWD": "/",
                "HOME": "/home/web_user",
                "LANG": lang,
                "_": getExecutableName()
              };
              for (var x in ENV) {
                if (ENV[x] === void 0) delete env[x];
                else env[x] = ENV[x];
              }
              var strings = [];
              for (var x in env) {
                strings.push(`${x}=${env[x]}`);
              }
              getEnvStrings.strings = strings;
            }
            return getEnvStrings.strings;
          };
          var stringToAscii = (str, buffer) => {
            for (var i = 0; i < str.length; ++i) {
              assert(str.charCodeAt(i) === (str.charCodeAt(i) & 255));
              HEAP8[buffer++ >> 0] = str.charCodeAt(i);
            }
            HEAP8[buffer >> 0] = 0;
          };
          var _environ_get = (__environ, environ_buf) => {
            var bufSize = 0;
            getEnvStrings().forEach((string, i) => {
              var ptr = environ_buf + bufSize;
              HEAPU32[__environ + i * 4 >> 2] = ptr;
              stringToAscii(string, ptr);
              bufSize += string.length + 1;
            });
            return 0;
          };
          var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
            var strings = getEnvStrings();
            HEAPU32[penviron_count >> 2] = strings.length;
            var bufSize = 0;
            strings.forEach((string) => bufSize += string.length + 1);
            HEAPU32[penviron_buf_size >> 2] = bufSize;
            return 0;
          };
          var runtimeKeepaliveCounter = 0;
          var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
          var _proc_exit = (code) => {
            EXITSTATUS = code;
            if (!keepRuntimeAlive()) {
              if (Module2["onExit"]) Module2["onExit"](code);
              ABORT = true;
            }
            quit_(code, new ExitStatus(code));
          };
          var exitJS = (status, implicit) => {
            EXITSTATUS = status;
            checkUnflushedContent();
            if (keepRuntimeAlive() && !implicit) {
              var msg = `program exited (with status: ${status}), but keepRuntimeAlive() is set (counter=${runtimeKeepaliveCounter}) due to an async operation, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)`;
              readyPromiseReject(msg);
              err(msg);
            }
            _proc_exit(status);
          };
          var _exit = exitJS;
          function _fd_close(fd) {
            try {
              var stream = SYSCALLS.getStreamFromFD(fd);
              FS.close(stream);
              return 0;
            } catch (e) {
              if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
              return e.errno;
            }
          }
          var doReadv = (stream, iov, iovcnt, offset) => {
            var ret = 0;
            for (var i = 0; i < iovcnt; i++) {
              var ptr = HEAPU32[iov >> 2];
              var len = HEAPU32[iov + 4 >> 2];
              iov += 8;
              var curr = FS.read(stream, HEAP8, ptr, len, offset);
              if (curr < 0) return -1;
              ret += curr;
              if (curr < len) break;
              if (typeof offset !== "undefined") {
                offset += curr;
              }
            }
            return ret;
          };
          function _fd_read(fd, iov, iovcnt, pnum) {
            try {
              var stream = SYSCALLS.getStreamFromFD(fd);
              var num = doReadv(stream, iov, iovcnt);
              HEAPU32[pnum >> 2] = num;
              return 0;
            } catch (e) {
              if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
              return e.errno;
            }
          }
          var convertI32PairToI53Checked = (lo, hi) => {
            assert(lo == lo >>> 0 || lo == (lo | 0));
            assert(hi === (hi | 0));
            return hi + 2097152 >>> 0 < 4194305 - !!lo ? (lo >>> 0) + hi * 4294967296 : NaN;
          };
          function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
            var offset = convertI32PairToI53Checked(offset_low, offset_high);
            ;
            try {
              if (isNaN(offset)) return 61;
              var stream = SYSCALLS.getStreamFromFD(fd);
              FS.llseek(stream, offset, whence);
              tempI64 = [stream.position >>> 0, (tempDouble = stream.position, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[newOffset >> 2] = tempI64[0], HEAP32[newOffset + 4 >> 2] = tempI64[1];
              if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
              return 0;
            } catch (e) {
              if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
              return e.errno;
            }
            ;
          }
          var doWritev = (stream, iov, iovcnt, offset) => {
            var ret = 0;
            for (var i = 0; i < iovcnt; i++) {
              var ptr = HEAPU32[iov >> 2];
              var len = HEAPU32[iov + 4 >> 2];
              iov += 8;
              var curr = FS.write(stream, HEAP8, ptr, len, offset);
              if (curr < 0) return -1;
              ret += curr;
              if (typeof offset !== "undefined") {
                offset += curr;
              }
            }
            return ret;
          };
          function _fd_write(fd, iov, iovcnt, pnum) {
            try {
              var stream = SYSCALLS.getStreamFromFD(fd);
              var num = doWritev(stream, iov, iovcnt);
              HEAPU32[pnum >> 2] = num;
              return 0;
            } catch (e) {
              if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
              return e.errno;
            }
          }
          var handleException = (e) => {
            if (e instanceof ExitStatus || e == "unwind") {
              return EXITSTATUS;
            }
            checkStackCookie();
            if (e instanceof WebAssembly.RuntimeError) {
              if (_emscripten_stack_get_current() <= 0) {
                err("Stack overflow detected.  You can try increasing -sSTACK_SIZE (currently set to 65536)");
              }
            }
            quit_(1, e);
          };
          var stringToUTF8OnStack = (str) => {
            var size = lengthBytesUTF8(str) + 1;
            var ret = stackAlloc(size);
            stringToUTF8(str, ret, size);
            return ret;
          };
          var FS_unlink = (path) => FS.unlink(path);
          var FSNode = (
            /** @constructor */
            function(parent, name, mode, rdev) {
              if (!parent) {
                parent = this;
              }
              this.parent = parent;
              this.mount = parent.mount;
              this.mounted = null;
              this.id = FS.nextInode++;
              this.name = name;
              this.mode = mode;
              this.node_ops = {};
              this.stream_ops = {};
              this.rdev = rdev;
            }
          );
          var readMode = 292 | 73;
          var writeMode = 146;
          Object.defineProperties(FSNode.prototype, {
            read: {
              get: (
                /** @this{FSNode} */
                function() {
                  return (this.mode & readMode) === readMode;
                }
              ),
              set: (
                /** @this{FSNode} */
                function(val) {
                  val ? this.mode |= readMode : this.mode &= ~readMode;
                }
              )
            },
            write: {
              get: (
                /** @this{FSNode} */
                function() {
                  return (this.mode & writeMode) === writeMode;
                }
              ),
              set: (
                /** @this{FSNode} */
                function(val) {
                  val ? this.mode |= writeMode : this.mode &= ~writeMode;
                }
              )
            },
            isFolder: {
              get: (
                /** @this{FSNode} */
                function() {
                  return FS.isDir(this.mode);
                }
              )
            },
            isDevice: {
              get: (
                /** @this{FSNode} */
                function() {
                  return FS.isChrdev(this.mode);
                }
              )
            }
          });
          FS.FSNode = FSNode;
          FS.createPreloadedFile = FS_createPreloadedFile;
          FS.staticInit();
          Module2["FS_createPath"] = FS.createPath;
          Module2["FS_createDataFile"] = FS.createDataFile;
          Module2["FS_createPreloadedFile"] = FS.createPreloadedFile;
          Module2["FS_unlink"] = FS.unlink;
          Module2["FS_createLazyFile"] = FS.createLazyFile;
          Module2["FS_createDevice"] = FS.createDevice;
          ;
          function checkIncomingModuleAPI() {
            ignoredModuleProp("fetchSettings");
          }
          var wasmImports = {
            /** @export */
            __assert_fail: ___assert_fail,
            /** @export */
            __syscall_fcntl64: ___syscall_fcntl64,
            /** @export */
            __syscall_fstat64: ___syscall_fstat64,
            /** @export */
            __syscall_getdents64: ___syscall_getdents64,
            /** @export */
            __syscall_ioctl: ___syscall_ioctl,
            /** @export */
            __syscall_lstat64: ___syscall_lstat64,
            /** @export */
            __syscall_newfstatat: ___syscall_newfstatat,
            /** @export */
            __syscall_openat: ___syscall_openat,
            /** @export */
            __syscall_rmdir: ___syscall_rmdir,
            /** @export */
            __syscall_stat64: ___syscall_stat64,
            /** @export */
            __syscall_unlinkat: ___syscall_unlinkat,
            /** @export */
            _emscripten_fs_load_embedded_files: __emscripten_fs_load_embedded_files,
            /** @export */
            _emscripten_get_now_is_monotonic: __emscripten_get_now_is_monotonic,
            /** @export */
            emscripten_date_now: _emscripten_date_now,
            /** @export */
            emscripten_get_now: _emscripten_get_now,
            /** @export */
            emscripten_memcpy_js: _emscripten_memcpy_js,
            /** @export */
            emscripten_resize_heap: _emscripten_resize_heap,
            /** @export */
            environ_get: _environ_get,
            /** @export */
            environ_sizes_get: _environ_sizes_get,
            /** @export */
            exit: _exit,
            /** @export */
            fd_close: _fd_close,
            /** @export */
            fd_read: _fd_read,
            /** @export */
            fd_seek: _fd_seek,
            /** @export */
            fd_write: _fd_write
          };
          var wasmExports = createWasm();
          var ___wasm_call_ctors = createExportWrapper("__wasm_call_ctors");
          var ___errno_location = createExportWrapper("__errno_location");
          var _free = createExportWrapper("free");
          var _malloc = createExportWrapper("malloc");
          var _fflush = Module2["_fflush"] = createExportWrapper("fflush");
          var _main = Module2["_main"] = createExportWrapper("__main_argc_argv");
          var _emscripten_stack_init = () => (_emscripten_stack_init = wasmExports["emscripten_stack_init"])();
          var _emscripten_stack_get_free = () => (_emscripten_stack_get_free = wasmExports["emscripten_stack_get_free"])();
          var _emscripten_stack_get_base = () => (_emscripten_stack_get_base = wasmExports["emscripten_stack_get_base"])();
          var _emscripten_stack_get_end = () => (_emscripten_stack_get_end = wasmExports["emscripten_stack_get_end"])();
          var stackSave = createExportWrapper("stackSave");
          var stackRestore = createExportWrapper("stackRestore");
          var stackAlloc = createExportWrapper("stackAlloc");
          var _emscripten_stack_get_current = () => (_emscripten_stack_get_current = wasmExports["emscripten_stack_get_current"])();
          var dynCall_jiji = Module2["dynCall_jiji"] = createExportWrapper("dynCall_jiji");
          var ___emscripten_embedded_file_data = Module2["___emscripten_embedded_file_data"] = 18226032;
          Module2["addRunDependency"] = addRunDependency;
          Module2["removeRunDependency"] = removeRunDependency;
          Module2["FS_createPath"] = FS.createPath;
          Module2["FS_createLazyFile"] = FS.createLazyFile;
          Module2["FS_createDevice"] = FS.createDevice;
          Module2["FS_createPreloadedFile"] = FS.createPreloadedFile;
          Module2["FS"] = FS;
          Module2["FS_createDataFile"] = FS.createDataFile;
          Module2["FS_unlink"] = FS.unlink;
          var missingLibrarySymbols = [
            "writeI53ToI64",
            "writeI53ToI64Clamped",
            "writeI53ToI64Signaling",
            "writeI53ToU64Clamped",
            "writeI53ToU64Signaling",
            "readI53FromI64",
            "readI53FromU64",
            "convertI32PairToI53",
            "convertU32PairToI53",
            "growMemory",
            "isLeapYear",
            "ydayFromDate",
            "arraySum",
            "addDays",
            "inetPton4",
            "inetNtop4",
            "inetPton6",
            "inetNtop6",
            "readSockaddr",
            "writeSockaddr",
            "getHostByName",
            "getCallstack",
            "emscriptenLog",
            "convertPCtoSourceLocation",
            "readEmAsmArgs",
            "jstoi_q",
            "jstoi_s",
            "listenOnce",
            "autoResumeAudioContext",
            "dynCallLegacy",
            "getDynCaller",
            "dynCall",
            "runtimeKeepalivePush",
            "runtimeKeepalivePop",
            "callUserCallback",
            "maybeExit",
            "asmjsMangle",
            "handleAllocatorInit",
            "HandleAllocator",
            "getNativeTypeSize",
            "STACK_SIZE",
            "STACK_ALIGN",
            "POINTER_SIZE",
            "ASSERTIONS",
            "getCFunc",
            "ccall",
            "cwrap",
            "uleb128Encode",
            "sigToWasmTypes",
            "generateFuncType",
            "convertJsFunctionToWasm",
            "getEmptyTableSlot",
            "updateTableMap",
            "getFunctionAddress",
            "addFunction",
            "removeFunction",
            "reallyNegative",
            "unSign",
            "strLen",
            "reSign",
            "formatString",
            "intArrayToString",
            "AsciiToString",
            "UTF16ToString",
            "stringToUTF16",
            "lengthBytesUTF16",
            "UTF32ToString",
            "stringToUTF32",
            "lengthBytesUTF32",
            "stringToNewUTF8",
            "writeArrayToMemory",
            "registerKeyEventCallback",
            "maybeCStringToJsString",
            "findEventTarget",
            "findCanvasEventTarget",
            "getBoundingClientRect",
            "fillMouseEventData",
            "registerMouseEventCallback",
            "registerWheelEventCallback",
            "registerUiEventCallback",
            "registerFocusEventCallback",
            "fillDeviceOrientationEventData",
            "registerDeviceOrientationEventCallback",
            "fillDeviceMotionEventData",
            "registerDeviceMotionEventCallback",
            "screenOrientation",
            "fillOrientationChangeEventData",
            "registerOrientationChangeEventCallback",
            "fillFullscreenChangeEventData",
            "registerFullscreenChangeEventCallback",
            "JSEvents_requestFullscreen",
            "JSEvents_resizeCanvasForFullscreen",
            "registerRestoreOldStyle",
            "hideEverythingExceptGivenElement",
            "restoreHiddenElements",
            "setLetterbox",
            "softFullscreenResizeWebGLRenderTarget",
            "doRequestFullscreen",
            "fillPointerlockChangeEventData",
            "registerPointerlockChangeEventCallback",
            "registerPointerlockErrorEventCallback",
            "requestPointerLock",
            "fillVisibilityChangeEventData",
            "registerVisibilityChangeEventCallback",
            "registerTouchEventCallback",
            "fillGamepadEventData",
            "registerGamepadEventCallback",
            "registerBeforeUnloadEventCallback",
            "fillBatteryEventData",
            "battery",
            "registerBatteryEventCallback",
            "setCanvasElementSize",
            "getCanvasElementSize",
            "jsStackTrace",
            "stackTrace",
            "checkWasiClock",
            "wasiRightsToMuslOFlags",
            "wasiOFlagsToMuslOFlags",
            "createDyncallWrapper",
            "safeSetTimeout",
            "setImmediateWrapped",
            "clearImmediateWrapped",
            "polyfillSetImmediate",
            "getPromise",
            "makePromise",
            "idsToPromises",
            "makePromiseCallback",
            "ExceptionInfo",
            "findMatchingCatch",
            "setMainLoop",
            "getSocketFromFD",
            "getSocketAddress",
            "FS_mkdirTree",
            "_setNetworkCallback",
            "heapObjectForWebGLType",
            "heapAccessShiftForWebGLHeap",
            "webgl_enable_ANGLE_instanced_arrays",
            "webgl_enable_OES_vertex_array_object",
            "webgl_enable_WEBGL_draw_buffers",
            "webgl_enable_WEBGL_multi_draw",
            "emscriptenWebGLGet",
            "computeUnpackAlignedImageSize",
            "colorChannelsInGlTextureFormat",
            "emscriptenWebGLGetTexPixelData",
            "__glGenObject",
            "emscriptenWebGLGetUniform",
            "webglGetUniformLocation",
            "webglPrepareUniformLocationsBeforeFirstUse",
            "webglGetLeftBracePos",
            "emscriptenWebGLGetVertexAttrib",
            "__glGetActiveAttribOrUniform",
            "writeGLArray",
            "registerWebGlEventCallback",
            "runAndAbortIfError",
            "SDL_unicode",
            "SDL_ttfContext",
            "SDL_audio",
            "ALLOC_NORMAL",
            "ALLOC_STACK",
            "allocate",
            "writeStringToMemory",
            "writeAsciiToMemory"
          ];
          missingLibrarySymbols.forEach(missingLibrarySymbol);
          var unexportedSymbols = [
            "run",
            "addOnPreRun",
            "addOnInit",
            "addOnPreMain",
            "addOnExit",
            "addOnPostRun",
            "FS_createFolder",
            "FS_createLink",
            "FS_readFile",
            "out",
            "err",
            "callMain",
            "abort",
            "wasmMemory",
            "wasmExports",
            "stackAlloc",
            "stackSave",
            "stackRestore",
            "getTempRet0",
            "setTempRet0",
            "writeStackCookie",
            "checkStackCookie",
            "convertI32PairToI53Checked",
            "ptrToString",
            "zeroMemory",
            "exitJS",
            "getHeapMax",
            "abortOnCannotGrowMemory",
            "ENV",
            "MONTH_DAYS_REGULAR",
            "MONTH_DAYS_LEAP",
            "MONTH_DAYS_REGULAR_CUMULATIVE",
            "MONTH_DAYS_LEAP_CUMULATIVE",
            "ERRNO_CODES",
            "ERRNO_MESSAGES",
            "setErrNo",
            "DNS",
            "Protocols",
            "Sockets",
            "initRandomFill",
            "randomFill",
            "timers",
            "warnOnce",
            "UNWIND_CACHE",
            "readEmAsmArgsArray",
            "getExecutableName",
            "handleException",
            "keepRuntimeAlive",
            "asyncLoad",
            "alignMemory",
            "mmapAlloc",
            "wasmTable",
            "noExitRuntime",
            "freeTableIndexes",
            "functionsInTableMap",
            "setValue",
            "getValue",
            "PATH",
            "PATH_FS",
            "UTF8Decoder",
            "UTF8ArrayToString",
            "UTF8ToString",
            "stringToUTF8Array",
            "stringToUTF8",
            "lengthBytesUTF8",
            "intArrayFromString",
            "stringToAscii",
            "UTF16Decoder",
            "stringToUTF8OnStack",
            "JSEvents",
            "specialHTMLTargets",
            "currentFullscreenStrategy",
            "restoreOldWindowedStyle",
            "demangle",
            "demangleAll",
            "ExitStatus",
            "getEnvStrings",
            "doReadv",
            "doWritev",
            "promiseMap",
            "uncaughtExceptionCount",
            "exceptionLast",
            "exceptionCaught",
            "Browser",
            "wget",
            "SYSCALLS",
            "preloadPlugins",
            "FS_modeStringToFlags",
            "FS_getMode",
            "FS_stdin_getChar_buffer",
            "FS_stdin_getChar",
            "MEMFS",
            "TTY",
            "PIPEFS",
            "SOCKFS",
            "tempFixedLengthArray",
            "miniTempWebGLFloatBuffers",
            "miniTempWebGLIntBuffers",
            "GL",
            "emscripten_webgl_power_preferences",
            "AL",
            "GLUT",
            "EGL",
            "GLEW",
            "IDBStore",
            "SDL",
            "SDL_gfx",
            "allocateUTF8",
            "allocateUTF8OnStack"
          ];
          unexportedSymbols.forEach(unexportedRuntimeSymbol);
          var calledRun;
          dependenciesFulfilled = function runCaller() {
            if (!calledRun) run();
            if (!calledRun) dependenciesFulfilled = runCaller;
          };
          function callMain(args = []) {
            assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on Module["onRuntimeInitialized"])');
            assert(__ATPRERUN__.length == 0, "cannot call main when preRun functions remain to be called");
            var entryFunction = _main;
            args.unshift(thisProgram);
            var argc = args.length;
            var argv = stackAlloc((argc + 1) * 4);
            var argv_ptr = argv;
            args.forEach((arg) => {
              HEAPU32[argv_ptr >> 2] = stringToUTF8OnStack(arg);
              argv_ptr += 4;
            });
            HEAPU32[argv_ptr >> 2] = 0;
            try {
              var ret = entryFunction(argc, argv);
              exitJS(
                ret,
                /* implicit = */
                true
              );
              return ret;
            } catch (e) {
              return handleException(e);
            }
          }
          function stackCheckInit() {
            _emscripten_stack_init();
            writeStackCookie();
          }
          function run(args = arguments_) {
            if (runDependencies > 0) {
              return;
            }
            stackCheckInit();
            preRun();
            if (runDependencies > 0) {
              return;
            }
            function doRun() {
              if (calledRun) return;
              calledRun = true;
              Module2["calledRun"] = true;
              if (ABORT) return;
              initRuntime();
              preMain();
              readyPromiseResolve(Module2);
              if (Module2["onRuntimeInitialized"]) Module2["onRuntimeInitialized"]();
              if (shouldRunNow) callMain(args);
              postRun();
            }
            if (Module2["setStatus"]) {
              Module2["setStatus"]("Running...");
              setTimeout(function() {
                setTimeout(function() {
                  Module2["setStatus"]("");
                }, 1);
                doRun();
              }, 1);
            } else {
              doRun();
            }
            checkStackCookie();
          }
          function checkUnflushedContent() {
            var oldOut = out;
            var oldErr = err;
            var has = false;
            out = err = (x) => {
              has = true;
            };
            try {
              _fflush(0);
              ["stdout", "stderr"].forEach(function(name) {
                var info = FS.analyzePath("/dev/" + name);
                if (!info) return;
                var stream = info.object;
                var rdev = stream.rdev;
                var tty = TTY.ttys[rdev];
                if (tty && tty.output && tty.output.length) {
                  has = true;
                }
              });
            } catch (e) {
            }
            out = oldOut;
            err = oldErr;
            if (has) {
              warnOnce("stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the Emscripten FAQ), or make sure to emit a newline when you printf etc.");
            }
          }
          if (Module2["preInit"]) {
            if (typeof Module2["preInit"] == "function") Module2["preInit"] = [Module2["preInit"]];
            while (Module2["preInit"].length > 0) {
              Module2["preInit"].pop()();
            }
          }
          var shouldRunNow = true;
          if (Module2["noInitialRun"]) shouldRunNow = false;
          run();
          return moduleArg.ready;
        });
      })();
      espeak_ng_default2 = ESpeakNG;
    }
  });

  // src/services/tts/offscreenBridge.ts
  var offscreenBridge_exports = {};
  __export(offscreenBridge_exports, {
    EspeakEngine: () => EspeakEngine,
    PIPER_CACHE_VERSION: () => PIPER_CACHE_VERSION,
    PiperEngine: () => PiperEngine,
    encodePcmWav: () => encodePcmWav,
    espeakEngine: () => espeakEngine,
    farsiOfflineTts: () => farsiOfflineTts,
    farsiPhonemizer: () => farsiPhonemizer,
    indexedDbModelStore: () => indexedDbModelStore,
    normalizePersianText: () => normalizePersianText,
    phonemesToPiperTokens: () => phonemesToPiperTokens,
    piperEngine: () => piperEngine
  });

  // src/services/tts/phonemizer/persianNormalizer.ts
  var ARABIC_TO_PERSIAN_MAP = {
    "\u064A": "\u06CC",
    "\u0649": "\u06CC",
    "\u0643": "\u06A9",
    "\u0629": "\u062A",
    "\u06C0": "\u0647\u200C\u06CC",
    "\u0624": "\u0648",
    "\u0625": "\u0627",
    "\u0623": "\u0627",
    "\u0621": "\u0626",
    "\u0640": ""
    // Tatweel
  };
  var ARABIC_DIGITS = {
    "\u0660": "\u06F0",
    "\u0661": "\u06F1",
    "\u0662": "\u06F2",
    "\u0663": "\u06F3",
    "\u0664": "\u06F4",
    "\u0665": "\u06F5",
    "\u0666": "\u06F6",
    "\u0667": "\u06F7",
    "\u0668": "\u06F8",
    "\u0669": "\u06F9"
  };
  var PUNCTUATION_MAP = {
    "\xAB": '"',
    "\xBB": '"',
    "\u201C": '"',
    "\u201D": '"',
    "\u2018": "'",
    "\u2019": "'",
    "\u2014": "-",
    "\u2013": "-",
    "\u0640": "",
    "\u06D4": ".",
    "\u060C": ",",
    "\u061B": ";",
    "\u061F": "?"
  };
  function normalizePersianText(raw) {
    if (!raw || typeof raw !== "string") return "";
    let text = raw;
    try {
      text = text.normalize("NFKC");
    } catch {
    }
    let charNormalized = "";
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ARABIC_TO_PERSIAN_MAP[ch] !== void 0) {
        charNormalized += ARABIC_TO_PERSIAN_MAP[ch];
      } else if (ARABIC_DIGITS[ch] !== void 0) {
        charNormalized += ARABIC_DIGITS[ch];
      } else if (PUNCTUATION_MAP[ch] !== void 0) {
        charNormalized += PUNCTUATION_MAP[ch];
      } else {
        charNormalized += ch;
      }
    }
    text = charNormalized;
    text = text.replace(/ـ+/g, "");
    const persianLetters = "[\u0627\u0628\u067E\u062A\u062B\u062C\u0686\u062D\u062E\u062F\u0630\u0631\u0632\u0698\u0633\u0634\u0635\u0636\u0637\u0638\u0639\u063A\u0641\u0642\u06A9\u06AF\u0644\u0645\u0646\u0648\u0647\u06CC]";
    const prefixRegex = new RegExp(`(^|\\s)\u0645\u06CC(?=${persianLetters}{2,})`, "g");
    const negPrefixRegex = new RegExp(`(^|\\s)\u0646\u0645\u06CC(?=${persianLetters}{2,})`, "g");
    text = text.replace(prefixRegex, "$1\u0645\u06CC\u200C");
    text = text.replace(negPrefixRegex, "$1\u0646\u0645\u06CC\u200C");
    const suffixRegex = new RegExp(`(${persianLetters}{2,})(\u0647\u0627|\u0647\u0627\u06CC|\u0647\u0627\u06CC\u06CC|\u062A\u0631|\u062A\u0631\u06CC\u0646)(?=[.,!?;:\u060C\u061B\u061F\\s]|$)`, "g");
    text = text.replace(suffixRegex, "$1\u200C$2");
    text = text.replace(/\u200C+/g, "\u200C").replace(/(^|[\s.,!?;:،؛؟"\(\)\[\]{}])\u200C+/g, "$1").replace(/\u200C+([\s.,!?;:،؛؟"\(\)\[\]{}]|$)/g, "$1");
    text = text.replace(/[\t\r\n]+/g, " ").replace(/ +/g, " ").trim();
    return text;
  }

  // node_modules/espeak-phonemizer/dist/wasm/espeak-ng.mjs
  var import_meta = {};
  async function createEspeakModule(moduleArg = {}) {
    var Module2 = moduleArg;
    var ENVIRONMENT_IS_WEB = !!globalThis.window;
    var ENVIRONMENT_IS_WORKER = !!globalThis.WorkerGlobalScope;
    var ENVIRONMENT_IS_NODE = globalThis.process?.versions?.node && globalThis.process?.type != "renderer";
    if (ENVIRONMENT_IS_NODE) {
      const { createRequire } = await import("node:module");
      var require2 = createRequire(import_meta.url);
    }
    var programArgs = [];
    var thisProgram = "./this.program";
    var quit_ = (status, toThrow) => {
      throw toThrow;
    };
    var _scriptName = import_meta.url;
    var scriptDirectory = "";
    function locateFile(path) {
      if (Module2["locateFile"]) {
        return Module2["locateFile"](path, scriptDirectory);
      }
      return scriptDirectory + path;
    }
    var readAsync, readBinary;
    if (ENVIRONMENT_IS_NODE) {
      var fs = require2("node:fs");
      if (_scriptName.startsWith("file:")) {
        scriptDirectory = require2("node:path").dirname(require2("node:url").fileURLToPath(_scriptName)) + "/";
      }
      readBinary = (filename) => {
        filename = isFileURI(filename) ? new URL(filename) : filename;
        var ret = fs.readFileSync(filename);
        return ret;
      };
      readAsync = async (filename, binary = true) => {
        filename = isFileURI(filename) ? new URL(filename) : filename;
        var ret = fs.readFileSync(filename, binary ? void 0 : "utf8");
        return ret;
      };
      if (process.argv.length > 1) {
        thisProgram = process.argv[1].replace(/\\/g, "/");
      }
      programArgs = process.argv.slice(2);
      quit_ = (status, toThrow) => {
        process.exitCode = status;
        throw toThrow;
      };
    } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      try {
        scriptDirectory = new URL(".", _scriptName).href;
      } catch {
      }
      {
        readAsync = async (url) => {
          var response = await fetch(url, { credentials: "same-origin" });
          if (response.ok) {
            return response.arrayBuffer();
          }
          throw new Error(response.status + " : " + response.url);
        };
      }
    } else {
    }
    var out = console.log.bind(console);
    var err = console.error.bind(console);
    var wasmBinary;
    var ABORT = false;
    var EXITSTATUS;
    var isFileURI = (filename) => filename.startsWith("file://");
    class EmscriptenEH {
    }
    class EmscriptenSjLj extends EmscriptenEH {
    }
    var runtimeInitialized = false;
    function getMemoryBuffer() {
      return wasmMemory.buffer;
    }
    function updateMemoryViews() {
      if (HEAP8?.buffer?.resizable) return;
      var b = getMemoryBuffer();
      HEAP8 = new Int8Array(b);
      HEAP16 = new Int16Array(b);
      HEAPU8 = new Uint8Array(b);
      HEAP32 = new Int32Array(b);
      HEAPU32 = new Uint32Array(b);
      HEAPF32 = new Float32Array(b);
      HEAPF64 = new Float64Array(b);
      HEAP64 = new BigInt64Array(b);
    }
    function preRun() {
      var preRun2 = Module2["preRun"];
      if (preRun2) {
        if (typeof preRun2 == "function") preRun2 = [preRun2];
        onPreRuns.push(...preRun2);
      }
      callRuntimeCallbacks(onPreRuns);
    }
    function initRuntime() {
      runtimeInitialized = true;
      if (!Module2["noFSInit"] && !FS.initialized) FS.init();
      TTY.init();
      wasmExports["s"]();
      FS.ignorePermissions = false;
    }
    function postRun() {
      var postRun2 = Module2["postRun"];
      if (postRun2) {
        if (typeof postRun2 == "function") postRun2 = [postRun2];
        onPostRuns.push(...postRun2);
      }
      callRuntimeCallbacks(onPostRuns);
    }
    function abort(what) {
      Module2["onAbort"]?.(what);
      what = `Aborted(${what})`;
      err(what);
      ABORT = true;
      what += ". Build with -sASSERTIONS for more info.";
      var e = new WebAssembly.RuntimeError(what);
      throw e;
    }
    var wasmBinaryFile;
    function findWasmBinary() {
      if (Module2["locateFile"]) {
        return locateFile("espeak-ng.wasm");
      }
      return new URL("espeak-ng.wasm", import_meta.url).href;
    }
    function getBinarySync(file) {
      if (readBinary) {
        return readBinary(file);
      }
      throw "both async and sync fetching of the wasm failed";
    }
    async function getWasmBinary(binaryFile) {
      if (!wasmBinary) {
        try {
          var response = await readAsync(binaryFile);
          return new Uint8Array(response);
        } catch {
        }
      }
      return getBinarySync(binaryFile);
    }
    async function instantiateArrayBuffer(binaryFile, imports) {
      try {
        var binary = await getWasmBinary(binaryFile);
        var instance = await WebAssembly.instantiate(binary, imports);
        return instance;
      } catch (reason) {
        err(`failed to asynchronously prepare wasm: ${reason}`);
        abort(reason);
      }
    }
    async function instantiateAsync(binary, binaryFile, imports) {
      if (!binary && !ENVIRONMENT_IS_NODE) {
        try {
          var response = fetch(binaryFile, { credentials: "same-origin" });
          var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
          return instantiationResult;
        } catch (reason) {
          err(`wasm streaming compile failed: ${reason}`);
          err("falling back to ArrayBuffer instantiation");
        }
      }
      return instantiateArrayBuffer(binaryFile, imports);
    }
    function getWasmImports() {
      var imports = { a: wasmImports };
      return imports;
    }
    async function createWasm() {
      function receiveInstance(instance) {
        wasmExports = instance.exports;
        assignWasmExports(wasmExports);
        updateMemoryViews();
        return wasmExports;
      }
      function receiveInstantiationResult(result2) {
        return receiveInstance(result2["instance"]);
      }
      var info = getWasmImports();
      var instantiateWasm = Module2["instantiateWasm"];
      if (instantiateWasm) {
        return new Promise((resolve) => {
          instantiateWasm(info, (inst) => resolve(receiveInstance(inst)));
        });
      }
      wasmBinaryFile ?? (wasmBinaryFile = findWasmBinary());
      var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
      var exports = receiveInstantiationResult(result);
      return exports;
    }
    class ExitStatus {
      constructor(status) {
        __publicField(this, "name", "ExitStatus");
        this.message = `Program terminated with exit(${status})`;
        this.status = status;
      }
    }
    var HEAP8;
    var callRuntimeCallbacks = (callbacks) => {
      while (callbacks.length > 0) {
        callbacks.shift()(Module2);
      }
    };
    var onPostRuns = [];
    var onPreRuns = [];
    var noExitRuntime = true;
    var stackRestore = (val) => __emscripten_stack_restore(val);
    var stackSave = () => _emscripten_stack_get_current();
    var HEAP32;
    var syscallGetVarargI = () => {
      var ret = HEAP32[+SYSCALLS.varargs >> 2];
      SYSCALLS.varargs += 4;
      return ret;
    };
    var syscallGetVarargP = syscallGetVarargI;
    var PATH = { isAbs: (path) => path.charAt(0) === "/", splitPath: (filename) => {
      var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
      return splitPathRe.exec(filename).slice(1);
    }, normalizeArray: (parts, allowAboveRoot) => {
      var up = 0;
      for (var i = parts.length - 1; i >= 0; i--) {
        var last = parts[i];
        if (last === ".") {
          parts.splice(i, 1);
        } else if (last === "..") {
          parts.splice(i, 1);
          up++;
        } else if (up) {
          parts.splice(i, 1);
          up--;
        }
      }
      if (allowAboveRoot) {
        for (; up; up--) {
          parts.unshift("..");
        }
      }
      return parts;
    }, normalize: (path) => {
      var isAbsolute = PATH.isAbs(path), trailingSlash = path.slice(-1) === "/";
      path = PATH.normalizeArray(path.split("/").filter((p) => !!p), !isAbsolute).join("/");
      if (!path && !isAbsolute) {
        path = ".";
      }
      if (path && trailingSlash) {
        path += "/";
      }
      return (isAbsolute ? "/" : "") + path;
    }, dirname: (path) => {
      var result = PATH.splitPath(path), root = result[0], dir = result[1];
      if (!root && !dir) {
        return ".";
      }
      if (dir) {
        dir = dir.slice(0, -1);
      }
      return root + dir;
    }, basename: (path) => path && path.match(/([^\/]+|\/)\/*$/)[1], join: (...paths) => PATH.normalize(paths.join("/")), join2: (l, r) => PATH.normalize(l + "/" + r) };
    var initRandomFill = () => {
      if (ENVIRONMENT_IS_NODE) {
        var nodeCrypto = require2("node:crypto");
        return (view) => (nodeCrypto.randomFillSync(view), 0);
      }
      return (view) => (crypto.getRandomValues(view), 0);
    };
    var randomFill = (view) => (randomFill = initRandomFill())(view);
    var PATH_FS = { resolve: (...args) => {
      var resolvedPath = "", resolvedAbsolute = false;
      for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
        var path = i >= 0 ? args[i] : FS.cwd();
        if (typeof path != "string") {
          throw new TypeError("Arguments to path.resolve must be strings");
        } else if (!path) {
          return "";
        }
        resolvedPath = path + "/" + resolvedPath;
        resolvedAbsolute = PATH.isAbs(path);
      }
      resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((p) => !!p), !resolvedAbsolute).join("/");
      return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
    }, relative: (from, to) => {
      from = PATH_FS.resolve(from).slice(1);
      to = PATH_FS.resolve(to).slice(1);
      function trim(arr) {
        var start = 0;
        for (; start < arr.length; start++) {
          if (arr[start] !== "") break;
        }
        var end = arr.length - 1;
        for (; end >= 0; end--) {
          if (arr[end] !== "") break;
        }
        if (start > end) return [];
        return arr.slice(start, end - start + 1);
      }
      var fromParts = trim(from.split("/"));
      var toParts = trim(to.split("/"));
      var length = Math.min(fromParts.length, toParts.length);
      var samePartsLength = length;
      for (var i = 0; i < length; i++) {
        if (fromParts[i] !== toParts[i]) {
          samePartsLength = i;
          break;
        }
      }
      var outputParts = [];
      for (var i = samePartsLength; i < fromParts.length; i++) {
        outputParts.push("..");
      }
      outputParts = outputParts.concat(toParts.slice(samePartsLength));
      return outputParts.join("/");
    } };
    var UTF8Decoder = globalThis.TextDecoder && new TextDecoder();
    var findStringEnd = (heapOrArray, idx, maxBytesToRead, ignoreNul) => {
      var maxIdx = idx + maxBytesToRead;
      if (ignoreNul) return maxIdx;
      while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
      return idx;
    };
    var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
      var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = "";
      while (idx < endPtr) {
        var u0 = heapOrArray[idx++];
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode((u0 & 31) << 6 | u1);
          continue;
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 240) == 224) {
          u0 = (u0 & 15) << 12 | u1 << 6 | u2;
        } else {
          u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        }
      }
      return str;
    };
    var FS_stdin_getChar_buffer = [];
    var lengthBytesUTF8 = (str) => {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        var c = str.charCodeAt(i);
        if (c <= 127) {
          len++;
        } else if (c <= 2047) {
          len += 2;
        } else if (c >= 55296 && c <= 57343) {
          len += 4;
          ++i;
        } else {
          len += 3;
        }
      }
      return len;
    };
    var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
      if (!(maxBytesToWrite > 0)) return 0;
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1;
      for (var i = 0; i < str.length; ++i) {
        var u = str.codePointAt(i);
        if (u <= 127) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 2047) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 192 | u >> 6;
          heap[outIdx++] = 128 | u & 63;
        } else if (u <= 65535) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 224 | u >> 12;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        } else {
          if (outIdx + 3 >= endIdx) break;
          heap[outIdx++] = 240 | u >> 18;
          heap[outIdx++] = 128 | u >> 12 & 63;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
          i++;
        }
      }
      heap[outIdx] = 0;
      return outIdx - startIdx;
    };
    var intArrayFromString = (stringy, dontAddNull, length) => {
      var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
      var u8array = new Array(len);
      var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
      if (dontAddNull) u8array.length = numBytesWritten;
      return u8array;
    };
    var FS_stdin_getChar = () => {
      if (!FS_stdin_getChar_buffer.length) {
        var result = null;
        if (ENVIRONMENT_IS_NODE) {
          var BUFSIZE = 256;
          var buf = Buffer.alloc(BUFSIZE);
          var bytesRead = 0;
          var fd = process.stdin.fd;
          try {
            bytesRead = fs.readSync(fd, buf, 0, BUFSIZE);
          } catch (e) {
            if (e.toString().includes("EOF")) bytesRead = 0;
            else throw e;
          }
          if (bytesRead > 0) {
            result = buf.slice(0, bytesRead).toString("utf-8");
          }
        } else if (globalThis.window?.prompt) {
          result = window.prompt("Input: ");
          if (result !== null) {
            result += "\n";
          }
        } else {
        }
        if (!result) {
          return null;
        }
        FS_stdin_getChar_buffer = intArrayFromString(result, true);
      }
      return FS_stdin_getChar_buffer.shift();
    };
    var TTY = { ttys: [], init() {
    }, shutdown() {
    }, register(dev, ops) {
      TTY.ttys[dev] = { input: [], output: [], ops };
      FS.registerDevice(dev, TTY.stream_ops);
    }, stream_ops: { open(stream) {
      var tty = TTY.ttys[stream.node.rdev];
      if (!tty) {
        throw new FS.ErrnoError(43);
      }
      stream.tty = tty;
      stream.seekable = false;
    }, close(stream) {
      stream.tty.ops.fsync(stream.tty);
    }, fsync(stream) {
      stream.tty.ops.fsync(stream.tty);
    }, read(stream, buffer, offset, length, pos) {
      if (!stream.tty || !stream.tty.ops.get_char) {
        throw new FS.ErrnoError(60);
      }
      var bytesRead = 0;
      for (var i = 0; i < length; i++) {
        var result;
        try {
          result = stream.tty.ops.get_char(stream.tty);
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
        if (result === void 0 && !bytesRead) {
          throw new FS.ErrnoError(6);
        }
        if (result === null || result === void 0) break;
        bytesRead++;
        buffer[offset + i] = result;
        if (result === 10) break;
      }
      if (bytesRead) {
        stream.node.atime = Date.now();
      }
      return bytesRead;
    }, write(stream, buffer, offset, length, pos) {
      if (!stream.tty || !stream.tty.ops.put_char) {
        throw new FS.ErrnoError(60);
      }
      try {
        for (var i = 0; i < length; i++) {
          stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
        }
      } catch (e) {
        throw new FS.ErrnoError(29);
      }
      if (length) {
        stream.node.mtime = stream.node.ctime = Date.now();
      }
      return i;
    } }, default_tty_ops: { get_char(tty) {
      return FS_stdin_getChar();
    }, put_char(tty, val) {
      if (val === null || val === 10) {
        out(UTF8ArrayToString(tty.output));
        tty.output = [];
      } else {
        if (val != 0) tty.output.push(val);
      }
    }, fsync(tty) {
      if (tty.output?.length > 0) {
        out(UTF8ArrayToString(tty.output));
        tty.output = [];
      }
    }, ioctl_tcgets(tty) {
      return { c_iflag: 25856, c_oflag: 5, c_cflag: 191, c_lflag: 35387, c_cc: [3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
    }, ioctl_tcsets(tty, optional_actions, data) {
      return 0;
    }, ioctl_tiocgwinsz(tty) {
      return [24, 80];
    } }, default_tty1_ops: { put_char(tty, val) {
      if (val === null || val === 10) {
        err(UTF8ArrayToString(tty.output));
        tty.output = [];
      } else {
        if (val != 0) tty.output.push(val);
      }
    }, fsync(tty) {
      if (tty.output?.length > 0) {
        err(UTF8ArrayToString(tty.output));
        tty.output = [];
      }
    } } };
    var mmapAlloc = (size) => {
      abort();
    };
    var MEMFS = { ops_table: null, mount(mount) {
      return MEMFS.createNode(null, "/", 16895, 0);
    }, createNode(parent, name, mode, dev) {
      if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
        throw new FS.ErrnoError(63);
      }
      MEMFS.ops_table || (MEMFS.ops_table = { dir: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr, lookup: MEMFS.node_ops.lookup, mknod: MEMFS.node_ops.mknod, rename: MEMFS.node_ops.rename, unlink: MEMFS.node_ops.unlink, rmdir: MEMFS.node_ops.rmdir, readdir: MEMFS.node_ops.readdir, symlink: MEMFS.node_ops.symlink }, stream: { llseek: MEMFS.stream_ops.llseek } }, file: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr }, stream: { llseek: MEMFS.stream_ops.llseek, read: MEMFS.stream_ops.read, write: MEMFS.stream_ops.write, mmap: MEMFS.stream_ops.mmap, msync: MEMFS.stream_ops.msync } }, link: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr, readlink: MEMFS.node_ops.readlink }, stream: {} }, chrdev: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr }, stream: FS.chrdev_stream_ops } });
      var node = FS.createNode(parent, name, mode, dev);
      if (FS.isDir(node.mode)) {
        node.node_ops = MEMFS.ops_table.dir.node;
        node.stream_ops = MEMFS.ops_table.dir.stream;
        node.contents = {};
      } else if (FS.isFile(node.mode)) {
        node.node_ops = MEMFS.ops_table.file.node;
        node.stream_ops = MEMFS.ops_table.file.stream;
        node.usedBytes = 0;
        node.contents = MEMFS.emptyFileContents ?? (MEMFS.emptyFileContents = new Uint8Array(0));
      } else if (FS.isLink(node.mode)) {
        node.node_ops = MEMFS.ops_table.link.node;
        node.stream_ops = MEMFS.ops_table.link.stream;
      } else if (FS.isChrdev(node.mode)) {
        node.node_ops = MEMFS.ops_table.chrdev.node;
        node.stream_ops = MEMFS.ops_table.chrdev.stream;
      }
      node.atime = node.mtime = node.ctime = Date.now();
      if (parent) {
        parent.contents[name] = node;
        parent.atime = parent.mtime = parent.ctime = node.atime;
      }
      return node;
    }, getFileDataAsTypedArray(node) {
      return node.contents.subarray(0, node.usedBytes);
    }, expandFileStorage(node, newCapacity) {
      var prevCapacity = node.contents.length;
      if (prevCapacity >= newCapacity) return;
      var CAPACITY_DOUBLING_MAX = 1024 * 1024;
      newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
      if (prevCapacity) newCapacity = Math.max(newCapacity, 256);
      var oldContents = MEMFS.getFileDataAsTypedArray(node);
      node.contents = new Uint8Array(newCapacity);
      node.contents.set(oldContents);
    }, resizeFileStorage(node, newSize) {
      if (node.usedBytes == newSize) return;
      var oldContents = node.contents;
      node.contents = new Uint8Array(newSize);
      node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
      node.usedBytes = newSize;
    }, node_ops: { getattr(node) {
      var attr = {};
      attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
      attr.ino = node.id;
      attr.mode = node.mode;
      attr.nlink = 1;
      attr.uid = 0;
      attr.gid = 0;
      attr.rdev = node.rdev;
      if (FS.isDir(node.mode)) {
        attr.size = 4096;
      } else if (FS.isFile(node.mode)) {
        attr.size = node.usedBytes;
      } else if (FS.isLink(node.mode)) {
        attr.size = node.link.length;
      } else {
        attr.size = 0;
      }
      attr.atime = new Date(node.atime);
      attr.mtime = new Date(node.mtime);
      attr.ctime = new Date(node.ctime);
      attr.blksize = 4096;
      attr.blocks = Math.ceil(attr.size / attr.blksize);
      return attr;
    }, setattr(node, attr) {
      for (const key of ["mode", "atime", "mtime", "ctime"]) {
        if (attr[key] != null) {
          node[key] = attr[key];
        }
      }
      if (attr.size !== void 0) {
        MEMFS.resizeFileStorage(node, attr.size);
      }
    }, lookup(parent, name) {
      if (!MEMFS.doesNotExistError) {
        MEMFS.doesNotExistError = new FS.ErrnoError(44);
        MEMFS.doesNotExistError.stack = "<generic error, no stack>";
      }
      throw MEMFS.doesNotExistError;
    }, mknod(parent, name, mode, dev) {
      return MEMFS.createNode(parent, name, mode, dev);
    }, rename(old_node, new_dir, new_name) {
      var new_node;
      try {
        new_node = FS.lookupNode(new_dir, new_name);
      } catch (e) {
      }
      if (new_node) {
        if (FS.isDir(old_node.mode)) {
          for (var i in new_node.contents) {
            throw new FS.ErrnoError(55);
          }
        }
        FS.hashRemoveNode(new_node);
      }
      delete old_node.parent.contents[old_node.name];
      new_dir.contents[new_name] = old_node;
      old_node.name = new_name;
      new_dir.ctime = new_dir.mtime = old_node.parent.ctime = old_node.parent.mtime = Date.now();
    }, unlink(parent, name) {
      delete parent.contents[name];
      parent.ctime = parent.mtime = Date.now();
    }, rmdir(parent, name) {
      var node = FS.lookupNode(parent, name);
      for (var i in node.contents) {
        throw new FS.ErrnoError(55);
      }
      delete parent.contents[name];
      parent.ctime = parent.mtime = Date.now();
    }, readdir(node) {
      return [".", "..", ...Object.keys(node.contents)];
    }, symlink(parent, newname, oldpath) {
      var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
      node.link = oldpath;
      return node;
    }, readlink(node) {
      if (!FS.isLink(node.mode)) {
        throw new FS.ErrnoError(28);
      }
      return node.link;
    } }, stream_ops: { read(stream, buffer, offset, length, position) {
      var contents = stream.node.contents;
      if (position >= stream.node.usedBytes) return 0;
      var size = Math.min(stream.node.usedBytes - position, length);
      buffer.set(contents.subarray(position, position + size), offset);
      return size;
    }, write(stream, buffer, offset, length, position, canOwn) {
      if (buffer.buffer === HEAP8.buffer) {
        canOwn = false;
      }
      if (!length) return 0;
      var node = stream.node;
      node.mtime = node.ctime = Date.now();
      if (canOwn) {
        node.contents = buffer.subarray(offset, offset + length);
        node.usedBytes = length;
      } else if (!node.usedBytes && !position) {
        node.contents = buffer.slice(offset, offset + length);
        node.usedBytes = length;
      } else {
        MEMFS.expandFileStorage(node, position + length);
        node.contents.set(buffer.subarray(offset, offset + length), position);
        node.usedBytes = Math.max(node.usedBytes, position + length);
      }
      return length;
    }, llseek(stream, offset, whence) {
      var position = offset;
      if (whence === 1) {
        position += stream.position;
      } else if (whence === 2) {
        if (FS.isFile(stream.node.mode)) {
          position += stream.node.usedBytes;
        }
      }
      if (position < 0) {
        throw new FS.ErrnoError(28);
      }
      return position;
    }, mmap(stream, length, position, prot, flags) {
      if (!FS.isFile(stream.node.mode)) {
        throw new FS.ErrnoError(43);
      }
      var ptr;
      var allocated;
      var contents = stream.node.contents;
      if (!(flags & 2) && contents.buffer === HEAP8.buffer) {
        allocated = false;
        ptr = contents.byteOffset;
      } else {
        allocated = true;
        ptr = mmapAlloc(length);
        if (!ptr) {
          throw new FS.ErrnoError(48);
        }
        if (contents) {
          if (position > 0 || position + length < contents.length) {
            if (contents.subarray) {
              contents = contents.subarray(position, position + length);
            } else {
              contents = Array.prototype.slice.call(contents, position, position + length);
            }
          }
          HEAP8.set(contents, ptr);
        }
      }
      return { ptr, allocated };
    }, msync(stream, buffer, offset, length, mmapFlags) {
      MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
      return 0;
    } } };
    var FS_modeStringToFlags = (str) => {
      if (typeof str != "string") return str;
      var flagModes = { r: 0, "r+": 2, w: 512 | 64 | 1, "w+": 512 | 64 | 2, a: 1024 | 64 | 1, "a+": 1024 | 64 | 2 };
      var flags = flagModes[str];
      if (typeof flags == "undefined") {
        throw new Error(`Unknown file open mode: ${str}`);
      }
      return flags;
    };
    var FS_fileDataToTypedArray = (data) => {
      if (typeof data == "string") {
        data = intArrayFromString(data, true);
      }
      if (!data.subarray) {
        data = new Uint8Array(data);
      }
      return data;
    };
    var FS_getMode = (canRead, canWrite) => {
      var mode = 0;
      if (canRead) mode |= 292 | 73;
      if (canWrite) mode |= 146;
      return mode;
    };
    var asyncLoad = async (url) => {
      var arrayBuffer = await readAsync(url);
      return new Uint8Array(arrayBuffer);
    };
    var FS_createDataFile = (...args) => FS.createDataFile(...args);
    var getUniqueRunDependency = (id) => id;
    var dependenciesPromise = null;
    var resolveRunDependencies = async () => dependenciesPromise;
    var runDependencies = 0;
    var dependenciesPromiseResolve = null;
    var removeRunDependency = (id) => {
      runDependencies--;
      Module2["monitorRunDependencies"]?.(runDependencies);
      if (!runDependencies) {
        dependenciesPromiseResolve();
      }
    };
    var addRunDependency = (id) => {
      if (!runDependencies) {
        dependenciesPromise = new Promise((resolve) => dependenciesPromiseResolve = resolve);
      }
      runDependencies++;
      Module2["monitorRunDependencies"]?.(runDependencies);
    };
    var preloadPlugins = [];
    var FS_handledByPreloadPlugin = async (byteArray, fullname) => {
      if (typeof Browser != "undefined") Browser.init();
      for (var plugin of preloadPlugins) {
        if (plugin["canHandle"](fullname)) {
          return plugin["handle"](byteArray, fullname);
        }
      }
      return byteArray;
    };
    var FS_preloadFile = async (parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish) => {
      var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
      var dep = getUniqueRunDependency(`cp ${fullname}`);
      addRunDependency(dep);
      try {
        var byteArray = url;
        if (typeof url == "string") {
          byteArray = await asyncLoad(url);
        }
        byteArray = await FS_handledByPreloadPlugin(byteArray, fullname);
        preFinish?.();
        if (!dontCreateFile) {
          FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
        }
      } finally {
        removeRunDependency(dep);
      }
    };
    var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
      FS_preloadFile(parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish).then(onload).catch(onerror);
    };
    var FS = { root: null, mounts: [], devices: {}, streams: [], nextInode: 1, nameTable: null, currentPath: "/", initialized: false, ignorePermissions: true, filesystems: null, syncFSRequests: 0, ErrnoError: class {
      constructor(errno) {
        __publicField(this, "name", "ErrnoError");
        this.errno = errno;
      }
    }, FSStream: class {
      constructor() {
        __publicField(this, "shared", {});
      }
      get object() {
        return this.node;
      }
      set object(val) {
        this.node = val;
      }
      get isRead() {
        return (this.flags & 2097155) !== 1;
      }
      get isWrite() {
        return (this.flags & 2097155) !== 0;
      }
      get isAppend() {
        return this.flags & 1024;
      }
      get flags() {
        return this.shared.flags;
      }
      set flags(val) {
        this.shared.flags = val;
      }
      get position() {
        return this.shared.position;
      }
      set position(val) {
        this.shared.position = val;
      }
    }, FSNode: class {
      constructor(parent, name, mode, rdev) {
        __publicField(this, "node_ops", {});
        __publicField(this, "stream_ops", {});
        __publicField(this, "readMode", 292 | 73);
        __publicField(this, "writeMode", 146);
        __publicField(this, "mounted", null);
        if (!parent) {
          parent = this;
        }
        this.parent = parent;
        this.mount = parent.mount;
        this.id = FS.nextInode++;
        this.name = name;
        this.mode = mode;
        this.rdev = rdev;
        this.atime = this.mtime = this.ctime = Date.now();
      }
      get read() {
        return (this.mode & this.readMode) === this.readMode;
      }
      set read(val) {
        val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
      }
      get write() {
        return (this.mode & this.writeMode) === this.writeMode;
      }
      set write(val) {
        val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
      }
      get isFolder() {
        return FS.isDir(this.mode);
      }
      get isDevice() {
        return FS.isChrdev(this.mode);
      }
      addListener(cb, exclusive = false) {
        var entry = { cb, exclusive };
        var listeners = this.listeners ?? (this.listeners = /* @__PURE__ */ new Set());
        listeners.add(entry);
        return { listeners, entry };
      }
      notifyListeners(flags) {
        if (!this.listeners) return;
        var excl;
        for (var entry of this.listeners) {
          if (entry.exclusive) (excl || (excl = [])).push(entry);
          else entry.cb(flags);
        }
        if (excl) {
          var i = (this.exclTurn || 0) % excl.length;
          this.exclTurn = i + 1;
          excl[i].cb(flags);
        }
      }
    }, lookupPath(path, opts = {}) {
      if (!path) {
        throw new FS.ErrnoError(44);
      }
      opts.follow_mount ?? (opts.follow_mount = true);
      if (!PATH.isAbs(path)) {
        path = FS.cwd() + "/" + path;
      }
      linkloop: for (var nlinks = 0; nlinks < 40; nlinks++) {
        var parts = path.split("/").filter((p) => !!p);
        var current = FS.root;
        var current_path = "/";
        for (var i = 0; i < parts.length; i++) {
          var islast = i === parts.length - 1;
          if (islast && opts.parent) {
            break;
          }
          if (parts[i] === ".") {
            continue;
          }
          if (parts[i] === "..") {
            current_path = PATH.dirname(current_path);
            if (FS.isRoot(current)) {
              path = current_path + "/" + parts.slice(i + 1).join("/");
              nlinks--;
              continue linkloop;
            } else {
              current = current.parent;
            }
            continue;
          }
          current_path = PATH.join2(current_path, parts[i]);
          try {
            current = FS.lookupNode(current, parts[i]);
          } catch (e) {
            if (e?.errno === 44 && islast && opts.noent_okay) {
              return { path: current_path };
            }
            throw e;
          }
          if (FS.isMountpoint(current) && (!islast || opts.follow_mount)) {
            current = current.mounted.root;
          }
          if (FS.isLink(current.mode) && (!islast || opts.follow)) {
            if (!current.node_ops.readlink) {
              throw new FS.ErrnoError(52);
            }
            var link = current.node_ops.readlink(current);
            if (!PATH.isAbs(link)) {
              link = PATH.dirname(current_path) + "/" + link;
            }
            path = link + "/" + parts.slice(i + 1).join("/");
            continue linkloop;
          }
        }
        return { path: current_path, node: current };
      }
      throw new FS.ErrnoError(32);
    }, getPath(node) {
      var path;
      while (true) {
        if (FS.isRoot(node)) {
          var mount = node.mount.mountpoint;
          if (!path) return mount;
          return mount[mount.length - 1] !== "/" ? `${mount}/${path}` : mount + path;
        }
        path = path ? `${node.name}/${path}` : node.name;
        node = node.parent;
      }
    }, hashName(parentid, name) {
      var hash = 0;
      for (var i = 0; i < name.length; i++) {
        hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
      }
      return (parentid + hash >>> 0) % FS.nameTable.length;
    }, hashAddNode(node) {
      var hash = FS.hashName(node.parent.id, node.name);
      node.name_next = FS.nameTable[hash];
      FS.nameTable[hash] = node;
    }, hashRemoveNode(node) {
      var hash = FS.hashName(node.parent.id, node.name);
      if (FS.nameTable[hash] === node) {
        FS.nameTable[hash] = node.name_next;
      } else {
        var current = FS.nameTable[hash];
        while (current) {
          if (current.name_next === node) {
            current.name_next = node.name_next;
            break;
          }
          current = current.name_next;
        }
      }
    }, lookupNode(parent, name) {
      var errCode = FS.mayLookup(parent);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      var hash = FS.hashName(parent.id, name);
      for (var node = FS.nameTable[hash]; node; node = node.name_next) {
        var nodeName = node.name;
        if (node.parent.id === parent.id && nodeName === name) {
          return node;
        }
      }
      return FS.lookup(parent, name);
    }, createNode(parent, name, mode, rdev) {
      var node = new FS.FSNode(parent, name, mode, rdev);
      FS.hashAddNode(node);
      return node;
    }, destroyNode(node) {
      FS.hashRemoveNode(node);
    }, isRoot(node) {
      return node === node.parent;
    }, isMountpoint(node) {
      return !!node.mounted;
    }, isFile(mode) {
      return (mode & 61440) === 32768;
    }, isDir(mode) {
      return (mode & 61440) === 16384;
    }, isLink(mode) {
      return (mode & 61440) === 40960;
    }, isChrdev(mode) {
      return (mode & 61440) === 8192;
    }, isBlkdev(mode) {
      return (mode & 61440) === 24576;
    }, isFIFO(mode) {
      return (mode & 61440) === 4096;
    }, isSocket(mode) {
      return (mode & 49152) === 49152;
    }, flagsToPermissionString(flag) {
      var perms = ["r", "w", "rw"][flag & 3];
      if (flag & 512) {
        perms += "w";
      }
      return perms;
    }, nodePermissions(node, perms) {
      if (FS.ignorePermissions) {
        return 0;
      }
      if (perms.includes("r") && !(node.mode & 292)) {
        return 2;
      }
      if (perms.includes("w") && !(node.mode & 146)) {
        return 2;
      }
      if (perms.includes("x") && !(node.mode & 73)) {
        return 2;
      }
      return 0;
    }, mayLookup(dir) {
      if (!FS.isDir(dir.mode)) return 54;
      var errCode = FS.nodePermissions(dir, "x");
      if (errCode) return errCode;
      if (!dir.node_ops.lookup) return 2;
      return 0;
    }, mayCreate(dir, name) {
      if (!FS.isDir(dir.mode)) {
        return 54;
      }
      try {
        var node = FS.lookupNode(dir, name);
        return 20;
      } catch (e) {
      }
      return FS.nodePermissions(dir, "wx");
    }, mayDelete(dir, name, isdir) {
      var node;
      try {
        node = FS.lookupNode(dir, name);
      } catch (e) {
        return e.errno;
      }
      var errCode = FS.nodePermissions(dir, "wx");
      if (errCode) {
        return errCode;
      }
      if (isdir) {
        if (!FS.isDir(node.mode)) {
          return 54;
        }
        if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
          return 10;
        }
      } else if (FS.isDir(node.mode)) {
        return 31;
      }
      return 0;
    }, mayOpen(node, flags) {
      if (!node) {
        return 44;
      }
      if (FS.isLink(node.mode)) {
        return 32;
      }
      var mode = FS.flagsToPermissionString(flags);
      if (FS.isDir(node.mode)) {
        if (mode !== "r" || flags & (512 | 64)) {
          return 31;
        }
      }
      return FS.nodePermissions(node, mode);
    }, checkOpExists(op, err2) {
      if (!op) {
        throw new FS.ErrnoError(err2);
      }
      return op;
    }, MAX_OPEN_FDS: 4096, nextfd() {
      for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
        if (!FS.streams[fd]) {
          return fd;
        }
      }
      throw new FS.ErrnoError(33);
    }, getStreamChecked(fd) {
      var stream = FS.getStream(fd);
      if (!stream) {
        throw new FS.ErrnoError(8);
      }
      return stream;
    }, getStream: (fd) => FS.streams[fd], createStream(stream, fd = -1) {
      stream = Object.assign(new FS.FSStream(), stream);
      if (fd == -1) {
        fd = FS.nextfd();
      }
      stream.fd = fd;
      FS.streams[fd] = stream;
      return stream;
    }, closeStream(fd) {
      FS.streams[fd] = null;
    }, dupStream(origStream, fd = -1) {
      var stream = FS.createStream(origStream, fd);
      stream.stream_ops?.dup?.(stream);
      return stream;
    }, doSetAttr(stream, node, attr) {
      var setattr = stream?.stream_ops.setattr;
      var arg = setattr ? stream : node;
      setattr ?? (setattr = node.node_ops.setattr);
      FS.checkOpExists(setattr, 63);
      try {
        setattr(arg, attr);
      } catch (e) {
        if (e instanceof RangeError) {
          throw new FS.ErrnoError(22);
        }
        throw e;
      }
    }, chrdev_stream_ops: { open(stream) {
      var device = FS.getDevice(stream.node.rdev);
      stream.stream_ops = device.stream_ops;
      stream.stream_ops.open?.(stream);
    }, llseek() {
      throw new FS.ErrnoError(70);
    } }, major: (dev) => dev >> 8, minor: (dev) => dev & 255, makedev: (ma, mi) => ma << 8 | mi, registerDevice(dev, ops) {
      FS.devices[dev] = { stream_ops: ops };
    }, getDevice: (dev) => FS.devices[dev], getMounts(mount) {
      var mounts = [];
      var check = [mount];
      while (check.length) {
        var m = check.pop();
        mounts.push(m);
        check.push(...m.mounts);
      }
      return mounts;
    }, syncfs(populate, callback) {
      if (typeof populate == "function") {
        callback = populate;
        populate = false;
      }
      FS.syncFSRequests++;
      if (FS.syncFSRequests > 1) {
        err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
      }
      var mounts = FS.getMounts(FS.root.mount);
      var completed = 0;
      function doCallback(errCode) {
        FS.syncFSRequests--;
        return callback(errCode);
      }
      function done(errCode) {
        if (errCode) {
          if (!done.errored) {
            done.errored = true;
            return doCallback(errCode);
          }
          return;
        }
        if (++completed >= mounts.length) {
          doCallback(null);
        }
      }
      for (var mount of mounts) {
        if (mount.type.syncfs) {
          mount.type.syncfs(mount, populate, done);
        } else {
          done(null);
        }
      }
    }, mount(type, opts, mountpoint) {
      var root = mountpoint === "/";
      var pseudo = !mountpoint;
      var node;
      if (root && FS.root) {
        throw new FS.ErrnoError(10);
      } else if (!root && !pseudo) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
        mountpoint = lookup.path;
        node = lookup.node;
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        if (!FS.isDir(node.mode)) {
          throw new FS.ErrnoError(54);
        }
      }
      var mount = { type, opts, mountpoint, mounts: [] };
      var mountRoot = type.mount(mount);
      mountRoot.mount = mount;
      mount.root = mountRoot;
      if (root) {
        FS.root = mountRoot;
      } else if (node) {
        node.mounted = mount;
        if (node.mount) {
          node.mount.mounts.push(mount);
        }
      }
      return mountRoot;
    }, unmount(mountpoint) {
      var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
      if (!FS.isMountpoint(lookup.node)) {
        throw new FS.ErrnoError(28);
      }
      var node = lookup.node;
      var mount = node.mounted;
      var mounts = FS.getMounts(mount);
      for (var [hash, current] of Object.entries(FS.nameTable)) {
        while (current) {
          var next = current.name_next;
          if (mounts.includes(current.mount)) {
            FS.destroyNode(current);
          }
          current = next;
        }
      }
      node.mounted = null;
      var idx = node.mount.mounts.indexOf(mount);
      node.mount.mounts.splice(idx, 1);
    }, lookup(parent, name) {
      return parent.node_ops.lookup(parent, name);
    }, mknod(path, mode, dev) {
      var lookup = FS.lookupPath(path, { parent: true });
      var parent = lookup.node;
      var name = PATH.basename(path);
      if (!name) {
        throw new FS.ErrnoError(28);
      }
      if (name === "." || name === "..") {
        throw new FS.ErrnoError(20);
      }
      var errCode = FS.mayCreate(parent, name);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!parent.node_ops.mknod) {
        throw new FS.ErrnoError(63);
      }
      return parent.node_ops.mknod(parent, name, mode, dev);
    }, statfs(path) {
      return FS.statfsNode(FS.lookupPath(path, { follow: true }).node);
    }, statfsStream(stream) {
      return FS.statfsNode(stream.node);
    }, statfsNode(node) {
      var rtn = { bsize: 4096, frsize: 4096, blocks: 1e6, bfree: 5e5, bavail: 5e5, files: FS.nextInode, ffree: FS.nextInode - 1, fsid: 42, flags: 2, namelen: 255 };
      if (node.node_ops.statfs) {
        Object.assign(rtn, node.node_ops.statfs(node.mount.opts.root));
      }
      return rtn;
    }, create(path, mode = 438) {
      mode &= 4095;
      mode |= 32768;
      return FS.mknod(path, mode, 0);
    }, mkdir(path, mode = 511) {
      mode &= 511 | 512;
      mode |= 16384;
      return FS.mknod(path, mode, 0);
    }, mkdirTree(path, mode) {
      var dirs = path.split("/");
      var d = "";
      for (var dir of dirs) {
        if (!dir) continue;
        if (d || PATH.isAbs(path)) d += "/";
        d += dir;
        try {
          FS.mkdir(d, mode);
        } catch (e) {
          if (e.errno != 20) throw e;
        }
      }
    }, mkdev(path, mode, dev) {
      if (typeof dev == "undefined") {
        dev = mode;
        mode = 438;
      }
      mode |= 8192;
      return FS.mknod(path, mode, dev);
    }, symlink(oldpath, newpath) {
      if (!PATH_FS.resolve(oldpath)) {
        throw new FS.ErrnoError(44);
      }
      var lookup = FS.lookupPath(newpath, { parent: true });
      var parent = lookup.node;
      if (!parent) {
        throw new FS.ErrnoError(44);
      }
      var newname = PATH.basename(newpath);
      var errCode = FS.mayCreate(parent, newname);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!parent.node_ops.symlink) {
        throw new FS.ErrnoError(63);
      }
      return parent.node_ops.symlink(parent, newname, oldpath);
    }, link(oldpath, newpath, flags) {
      var lookup = FS.lookupPath(newpath, { parent: true });
      var parent = lookup.node;
      if (!parent) {
        throw new FS.ErrnoError(44);
      }
      var newname = PATH.basename(newpath);
      var errCode = FS.mayCreate(parent, newname);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!parent.node_ops.link) {
        throw new FS.ErrnoError(34);
      }
      return parent.node_ops.link(parent, newname, oldpath, flags);
    }, rename(old_path, new_path) {
      var old_dirname = PATH.dirname(old_path);
      var new_dirname = PATH.dirname(new_path);
      var old_name = PATH.basename(old_path);
      var new_name = PATH.basename(new_path);
      var lookup, old_dir, new_dir;
      lookup = FS.lookupPath(old_path, { parent: true });
      old_dir = lookup.node;
      lookup = FS.lookupPath(new_path, { parent: true });
      new_dir = lookup.node;
      if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
      if (old_dir.mount !== new_dir.mount) {
        throw new FS.ErrnoError(75);
      }
      var old_node = FS.lookupNode(old_dir, old_name);
      var relative = PATH_FS.relative(old_path, new_dirname);
      if (relative.charAt(0) !== ".") {
        throw new FS.ErrnoError(28);
      }
      relative = PATH_FS.relative(new_path, old_dirname);
      if (relative.charAt(0) !== ".") {
        throw new FS.ErrnoError(55);
      }
      var new_node;
      try {
        new_node = FS.lookupNode(new_dir, new_name);
      } catch (e) {
      }
      if (old_node === new_node) {
        return;
      }
      var isdir = FS.isDir(old_node.mode);
      var errCode = FS.mayDelete(old_dir, old_name, isdir);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!old_dir.node_ops.rename) {
        throw new FS.ErrnoError(63);
      }
      if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
        throw new FS.ErrnoError(10);
      }
      if (new_dir !== old_dir) {
        errCode = FS.nodePermissions(old_dir, "w");
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
      }
      FS.hashRemoveNode(old_node);
      try {
        old_dir.node_ops.rename(old_node, new_dir, new_name);
        old_node.parent = new_dir;
      } catch (e) {
        throw e;
      } finally {
        FS.hashAddNode(old_node);
      }
    }, rmdir(path) {
      var lookup = FS.lookupPath(path, { parent: true });
      var parent = lookup.node;
      var name = PATH.basename(path);
      var node = FS.lookupNode(parent, name);
      var errCode = FS.mayDelete(parent, name, true);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!parent.node_ops.rmdir) {
        throw new FS.ErrnoError(63);
      }
      if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(10);
      }
      parent.node_ops.rmdir(parent, name);
      FS.destroyNode(node);
    }, readdir(path) {
      var lookup = FS.lookupPath(path, { follow: true });
      var node = lookup.node;
      var readdir = FS.checkOpExists(node.node_ops.readdir, 54);
      return readdir(node);
    }, unlink(path) {
      var lookup = FS.lookupPath(path, { parent: true });
      var parent = lookup.node;
      if (!parent) {
        throw new FS.ErrnoError(44);
      }
      var name = PATH.basename(path);
      var node = FS.lookupNode(parent, name);
      var errCode = FS.mayDelete(parent, name, false);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!parent.node_ops.unlink) {
        throw new FS.ErrnoError(63);
      }
      if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(10);
      }
      parent.node_ops.unlink(parent, name);
      FS.destroyNode(node);
    }, readlink(path) {
      var lookup = FS.lookupPath(path);
      var link = lookup.node;
      if (!link) {
        throw new FS.ErrnoError(44);
      }
      if (!link.node_ops.readlink) {
        throw new FS.ErrnoError(28);
      }
      return link.node_ops.readlink(link);
    }, stat(path, dontFollow) {
      var lookup = FS.lookupPath(path, { follow: !dontFollow });
      var node = lookup.node;
      var getattr = FS.checkOpExists(node.node_ops.getattr, 63);
      return getattr(node);
    }, fstat(fd) {
      var stream = FS.getStreamChecked(fd);
      var node = stream.node;
      var getattr = stream.stream_ops.getattr;
      var arg = getattr ? stream : node;
      getattr ?? (getattr = node.node_ops.getattr);
      FS.checkOpExists(getattr, 63);
      return getattr(arg);
    }, lstat(path) {
      return FS.stat(path, true);
    }, doChmod(stream, node, mode, dontFollow) {
      FS.doSetAttr(stream, node, { mode: mode & 4095 | node.mode & ~4095, ctime: Date.now(), dontFollow });
    }, chmod(path, mode, dontFollow) {
      var node;
      if (typeof path == "string") {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        node = lookup.node;
      } else {
        node = path;
      }
      FS.doChmod(null, node, mode, dontFollow);
    }, lchmod(path, mode) {
      FS.chmod(path, mode, true);
    }, fchmod(fd, mode) {
      var stream = FS.getStreamChecked(fd);
      FS.doChmod(stream, stream.node, mode, false);
    }, doChown(stream, node, dontFollow) {
      FS.doSetAttr(stream, node, { timestamp: Date.now(), dontFollow });
    }, chown(path, uid, gid, dontFollow) {
      var node;
      if (typeof path == "string") {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        node = lookup.node;
      } else {
        node = path;
      }
      FS.doChown(null, node, dontFollow);
    }, lchown(path, uid, gid) {
      FS.chown(path, uid, gid, true);
    }, fchown(fd, uid, gid) {
      var stream = FS.getStreamChecked(fd);
      FS.doChown(stream, stream.node, false);
    }, doTruncate(stream, node, len) {
      if (FS.isDir(node.mode)) {
        throw new FS.ErrnoError(31);
      }
      if (!FS.isFile(node.mode)) {
        throw new FS.ErrnoError(28);
      }
      var errCode = FS.nodePermissions(node, "w");
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      FS.doSetAttr(stream, node, { size: len, timestamp: Date.now() });
    }, truncate(path, len) {
      if (len < 0) {
        throw new FS.ErrnoError(28);
      }
      var node;
      if (typeof path == "string") {
        var lookup = FS.lookupPath(path, { follow: true });
        node = lookup.node;
      } else {
        node = path;
      }
      FS.doTruncate(null, node, len);
    }, ftruncate(fd, len) {
      var stream = FS.getStreamChecked(fd);
      if (len < 0 || (stream.flags & 2097155) === 0) {
        throw new FS.ErrnoError(28);
      }
      FS.doTruncate(stream, stream.node, len);
    }, utime(path, atime, mtime, dontFollow) {
      var lookup = FS.lookupPath(path, { follow: !dontFollow });
      FS.doSetAttr(null, lookup.node, { atime, mtime, dontFollow });
    }, open(path, flags, mode = 438) {
      if (path === "") {
        throw new FS.ErrnoError(44);
      }
      flags = FS_modeStringToFlags(flags);
      if (flags & 64) {
        mode = mode & 4095 | 32768;
      } else {
        mode = 0;
      }
      var node;
      var isDirPath;
      if (typeof path == "object") {
        node = path;
      } else {
        isDirPath = path.endsWith("/");
        var lookup = FS.lookupPath(path, { follow: !(flags & 131072), noent_okay: true });
        node = lookup.node;
        path = lookup.path;
      }
      var created = false;
      if (flags & 64) {
        if (node) {
          if (flags & 128) {
            throw new FS.ErrnoError(20);
          }
        } else if (isDirPath) {
          throw new FS.ErrnoError(31);
        } else {
          node = FS.mknod(path, mode | 511, 0);
          created = true;
        }
      }
      if (!node) {
        throw new FS.ErrnoError(44);
      }
      if (FS.isChrdev(node.mode)) {
        flags &= ~512;
      }
      if (flags & 65536 && !FS.isDir(node.mode)) {
        throw new FS.ErrnoError(54);
      }
      if (!created) {
        var errCode = FS.mayOpen(node, flags);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
      }
      if (flags & 512 && !created) {
        FS.truncate(node, 0);
      }
      flags &= ~(128 | 512 | 131072);
      var stream = FS.createStream({ node, path: FS.getPath(node), flags, seekable: true, position: 0, stream_ops: node.stream_ops, ungotten: [], error: false });
      if (stream.stream_ops.open) {
        stream.stream_ops.open(stream);
      }
      if (created) {
        FS.chmod(node, mode & 511);
      }
      return stream;
    }, close(stream) {
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if (stream.getdents) stream.getdents = null;
      stream.node?.notifyListeners(32);
      try {
        if (stream.stream_ops.close) {
          stream.stream_ops.close(stream);
        }
      } catch (e) {
        throw e;
      } finally {
        FS.closeStream(stream.fd);
      }
      stream.fd = null;
    }, isClosed(stream) {
      return stream.fd === null;
    }, llseek(stream, offset, whence) {
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if (!stream.seekable || !stream.stream_ops.llseek) {
        throw new FS.ErrnoError(70);
      }
      if (whence != 0 && whence != 1 && whence != 2) {
        throw new FS.ErrnoError(28);
      }
      stream.position = stream.stream_ops.llseek(stream, offset, whence);
      stream.ungotten = [];
      return stream.position;
    }, read(stream, buffer, offset, length, position) {
      if (length < 0 || position < 0) {
        throw new FS.ErrnoError(28);
      }
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if ((stream.flags & 2097155) === 1) {
        throw new FS.ErrnoError(8);
      }
      if (FS.isDir(stream.node.mode)) {
        throw new FS.ErrnoError(31);
      }
      if (!stream.stream_ops.read) {
        throw new FS.ErrnoError(28);
      }
      var seeking = typeof position != "undefined";
      if (!seeking) {
        position = stream.position;
      } else if (!stream.seekable) {
        throw new FS.ErrnoError(70);
      }
      var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
      if (!seeking) stream.position += bytesRead;
      return bytesRead;
    }, write(stream, buffer, offset, length, position, canOwn) {
      if (length < 0 || position < 0) {
        throw new FS.ErrnoError(28);
      }
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if ((stream.flags & 2097155) === 0) {
        throw new FS.ErrnoError(8);
      }
      if (FS.isDir(stream.node.mode)) {
        throw new FS.ErrnoError(31);
      }
      if (!stream.stream_ops.write) {
        throw new FS.ErrnoError(28);
      }
      if (stream.seekable && stream.flags & 1024) {
        FS.llseek(stream, 0, 2);
      }
      var seeking = typeof position != "undefined";
      if (!seeking) {
        position = stream.position;
      } else if (!stream.seekable) {
        throw new FS.ErrnoError(70);
      }
      var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
      if (!seeking) stream.position += bytesWritten;
      return bytesWritten;
    }, mmap(stream, length, position, prot, flags) {
      if (prot & 2 && !(flags & 2) && (stream.flags & 2097155) !== 2) {
        throw new FS.ErrnoError(2);
      }
      if ((stream.flags & 2097155) === 1) {
        throw new FS.ErrnoError(2);
      }
      if (!stream.stream_ops.mmap) {
        throw new FS.ErrnoError(43);
      }
      if (!length) {
        throw new FS.ErrnoError(28);
      }
      return stream.stream_ops.mmap(stream, length, position, prot, flags);
    }, msync(stream, buffer, offset, length, mmapFlags) {
      if (!stream.stream_ops.msync) {
        return 0;
      }
      return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
    }, ioctl(stream, cmd, arg) {
      if (!stream.stream_ops.ioctl) {
        throw new FS.ErrnoError(59);
      }
      return stream.stream_ops.ioctl(stream, cmd, arg);
    }, readFile(path, opts = {}) {
      opts.flags = opts.flags ?? 0;
      opts.encoding = opts.encoding ?? "binary";
      if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
        abort(`Invalid encoding type "${opts.encoding}"`);
      }
      var stream = FS.open(path, opts.flags);
      var stat = FS.stat(path);
      var length = stat.size;
      var buf = new Uint8Array(length);
      FS.read(stream, buf, 0, length, 0);
      if (opts.encoding === "utf8") {
        buf = UTF8ArrayToString(buf);
      }
      FS.close(stream);
      return buf;
    }, writeFile(path, data, opts = {}) {
      opts.flags = opts.flags ?? 577;
      var stream = FS.open(path, opts.flags, opts.mode);
      data = FS_fileDataToTypedArray(data);
      FS.write(stream, data, 0, data.byteLength, void 0, opts.canOwn);
      FS.close(stream);
    }, cwd: () => FS.currentPath, chdir(path) {
      var lookup = FS.lookupPath(path, { follow: true });
      if (lookup.node === null) {
        throw new FS.ErrnoError(44);
      }
      if (!FS.isDir(lookup.node.mode)) {
        throw new FS.ErrnoError(54);
      }
      var errCode = FS.nodePermissions(lookup.node, "x");
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      FS.currentPath = lookup.path;
    }, createDefaultDirectories() {
      FS.mkdir("/tmp");
      FS.mkdir("/home");
      FS.mkdir("/home/web_user");
    }, createDefaultDevices() {
      FS.mkdir("/dev");
      FS.registerDevice(FS.makedev(1, 3), { read: () => 0, write: (stream, buffer, offset, length, pos) => length, llseek: () => 0 });
      FS.mkdev("/dev/null", FS.makedev(1, 3));
      TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
      TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
      FS.mkdev("/dev/tty", FS.makedev(5, 0));
      FS.mkdev("/dev/tty1", FS.makedev(6, 0));
      var randomBuffer = new Uint8Array(1024), randomLeft = 0;
      var randomByte = () => {
        if (!randomLeft) {
          randomFill(randomBuffer);
          randomLeft = randomBuffer.byteLength;
        }
        return randomBuffer[--randomLeft];
      };
      FS.createDevice("/dev", "random", randomByte);
      FS.createDevice("/dev", "urandom", randomByte);
      FS.mkdir("/dev/shm");
      FS.mkdir("/dev/shm/tmp");
    }, createSpecialDirectories() {
      FS.mkdir("/proc");
      var proc_self = FS.mkdir("/proc/self");
      FS.mkdir("/proc/self/fd");
      FS.mount({ mount() {
        var node = FS.createNode(proc_self, "fd", 16895, 73);
        node.stream_ops = { llseek: MEMFS.stream_ops.llseek };
        node.node_ops = { lookup(parent, name) {
          var fd = +name;
          var stream = FS.getStreamChecked(fd);
          var ret = { parent: null, mount: { mountpoint: "fake" }, node_ops: { readlink: () => stream.path }, id: fd + 1 };
          ret.parent = ret;
          return ret;
        }, readdir() {
          return Array.from(FS.streams.entries()).filter(([k, v]) => v).map(([k, v]) => k.toString());
        } };
        return node;
      } }, {}, "/proc/self/fd");
    }, createStandardStreams(input, output, error) {
      if (input) {
        FS.createDevice("/dev", "stdin", input);
      } else {
        FS.symlink("/dev/tty", "/dev/stdin");
      }
      if (output) {
        FS.createDevice("/dev", "stdout", null, output);
      } else {
        FS.symlink("/dev/tty", "/dev/stdout");
      }
      if (error) {
        FS.createDevice("/dev", "stderr", null, error);
      } else {
        FS.symlink("/dev/tty1", "/dev/stderr");
      }
      var stdin = FS.open("/dev/stdin", 0);
      var stdout = FS.open("/dev/stdout", 1);
      var stderr = FS.open("/dev/stderr", 1);
    }, staticInit() {
      FS.nameTable = new Array(4096);
      FS.mount(MEMFS, {}, "/");
      FS.createDefaultDirectories();
      FS.createDefaultDevices();
      FS.createSpecialDirectories();
      FS.filesystems = { MEMFS };
    }, init(input, output, error) {
      FS.initialized = true;
      input ?? (input = Module2["stdin"]);
      output ?? (output = Module2["stdout"]);
      error ?? (error = Module2["stderr"]);
      FS.createStandardStreams(input, output, error);
    }, quit() {
      FS.initialized = false;
      for (var stream of FS.streams) {
        if (stream) {
          FS.close(stream);
        }
      }
    }, findObject(path, dontResolveLastLink) {
      var ret = FS.analyzePath(path, dontResolveLastLink);
      if (!ret.exists) {
        return null;
      }
      return ret.object;
    }, analyzePath(path, dontResolveLastLink) {
      try {
        var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
        path = lookup.path;
      } catch (e) {
      }
      var ret = { isRoot: false, exists: false, error: 0, name: null, path: null, object: null, parentExists: false, parentPath: null, parentObject: null };
      try {
        var lookup = FS.lookupPath(path, { parent: true });
        ret.parentExists = true;
        ret.parentPath = lookup.path;
        ret.parentObject = lookup.node;
        ret.name = PATH.basename(path);
        lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
        ret.exists = true;
        ret.path = lookup.path;
        ret.object = lookup.node;
        ret.name = lookup.node.name;
        ret.isRoot = lookup.path === "/";
      } catch (e) {
        ret.error = e.errno;
      }
      return ret;
    }, createPath(parent, path, canRead, canWrite) {
      parent = typeof parent == "string" ? parent : FS.getPath(parent);
      var parts = path.split("/").reverse();
      while (parts.length) {
        var part = parts.pop();
        if (!part) continue;
        var current = PATH.join2(parent, part);
        try {
          FS.mkdir(current);
        } catch (e) {
          if (e.errno != 20) throw e;
        }
        parent = current;
      }
      return current;
    }, createFile(parent, name, properties, canRead, canWrite) {
      var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
      var mode = FS_getMode(canRead, canWrite);
      return FS.create(path, mode);
    }, createDataFile(parent, name, data, canRead, canWrite, canOwn) {
      var path = name;
      if (parent) {
        parent = typeof parent == "string" ? parent : FS.getPath(parent);
        path = name ? PATH.join2(parent, name) : parent;
      }
      var mode = FS_getMode(canRead, canWrite);
      var node = FS.create(path, mode);
      if (data) {
        data = FS_fileDataToTypedArray(data);
        FS.chmod(node, mode | 146);
        var stream = FS.open(node, 577);
        FS.write(stream, data, 0, data.length, 0, canOwn);
        FS.close(stream);
        FS.chmod(node, mode);
      }
    }, createDevice(parent, name, input, output) {
      var _a;
      var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
      var mode = FS_getMode(!!input, !!output);
      (_a = FS.createDevice).major ?? (_a.major = 64);
      var dev = FS.makedev(FS.createDevice.major++, 0);
      FS.registerDevice(dev, { open(stream) {
        stream.seekable = false;
      }, close(stream) {
        if (output?.buffer?.length) {
          output(10);
        }
      }, read(stream, buffer, offset, length, pos) {
        var bytesRead = 0;
        for (var i = 0; i < length; i++) {
          var result;
          try {
            result = input();
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (result === void 0 && !bytesRead) {
            throw new FS.ErrnoError(6);
          }
          if (result === null || result === void 0) break;
          bytesRead++;
          buffer[offset + i] = result;
        }
        if (bytesRead) {
          stream.node.atime = Date.now();
        }
        return bytesRead;
      }, write(stream, buffer, offset, length, pos) {
        for (var i = 0; i < length; i++) {
          try {
            output(buffer[offset + i]);
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
        }
        if (length) {
          stream.node.mtime = stream.node.ctime = Date.now();
        }
        return i;
      } });
      return FS.mkdev(path, mode, dev);
    }, forceLoadFile(obj) {
      if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
      if (globalThis.XMLHttpRequest) {
        abort("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
      } else {
        try {
          obj.contents = readBinary(obj.url);
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
      }
    }, createLazyFile(parent, name, url, canRead, canWrite) {
      class LazyUint8Array {
        constructor() {
          __publicField(this, "lengthKnown", false);
          __publicField(this, "chunks", []);
        }
        get(idx) {
          if (idx > this.length - 1 || idx < 0) {
            return void 0;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = idx / this.chunkSize | 0;
          return this.getter(chunkNum)[chunkOffset];
        }
        setDataGetter(getter) {
          this.getter = getter;
        }
        cacheLength() {
          var xhr = new XMLHttpRequest();
          xhr.open("HEAD", url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) abort(`Couldn't load ${url}. Status: ${xhr.status}`);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
          var chunkSize = 1024 * 1024;
          if (!hasByteServing) chunkSize = datalength;
          var doXHR = (from, to) => {
            if (from > to) abort(`invalid range (${from}, ${to}) or no bytes requested!`);
            if (to > datalength - 1) abort(`only ${datalength} bytes available! programmer error!`);
            var xhr2 = new XMLHttpRequest();
            xhr2.open("GET", url, false);
            if (datalength !== chunkSize) xhr2.setRequestHeader("Range", `bytes=${from}-${to}`);
            xhr2.responseType = "arraybuffer";
            if (xhr2.overrideMimeType) {
              xhr2.overrideMimeType("text/plain; charset=x-user-defined");
            }
            xhr2.send(null);
            if (!(xhr2.status >= 200 && xhr2.status < 300 || xhr2.status === 304)) abort(`Couldn't load ${url}. Status: ${xhr2.status}`);
            if (xhr2.response !== void 0) {
              return new Uint8Array(xhr2.response || []);
            }
            return intArrayFromString(xhr2.responseText ?? "", true);
          };
          var lazyArray2 = this;
          lazyArray2.setDataGetter((chunkNum) => {
            var start = chunkNum * chunkSize;
            var end = (chunkNum + 1) * chunkSize - 1;
            end = Math.min(end, datalength - 1);
            if (typeof lazyArray2.chunks[chunkNum] == "undefined") {
              lazyArray2.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof lazyArray2.chunks[chunkNum] == "undefined") abort("doXHR failed!");
            return lazyArray2.chunks[chunkNum];
          });
          if (usesGzip || !datalength) {
            chunkSize = datalength = 1;
            datalength = this.getter(0).length;
            chunkSize = datalength;
            out("LazyFiles on gzip forces download of the whole file when length is accessed");
          }
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        }
        get length() {
          if (!this.lengthKnown) {
            this.cacheLength();
          }
          return this._length;
        }
        get chunkSize() {
          if (!this.lengthKnown) {
            this.cacheLength();
          }
          return this._chunkSize;
        }
      }
      if (globalThis.XMLHttpRequest) {
        if (!ENVIRONMENT_IS_WORKER) abort("Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc");
        var lazyArray = new LazyUint8Array();
        var properties = { isDevice: false, contents: lazyArray };
      } else {
        var properties = { isDevice: false, url };
      }
      var node = FS.createFile(parent, name, properties, canRead, canWrite);
      if (properties.contents) {
        node.contents = properties.contents;
      } else if (properties.url) {
        node.contents = null;
        node.url = properties.url;
      }
      Object.defineProperties(node, { usedBytes: { get: function() {
        return this.contents.length;
      } } });
      var stream_ops = {};
      for (const [key, fn] of Object.entries(node.stream_ops)) {
        stream_ops[key] = (...args) => {
          FS.forceLoadFile(node);
          return fn(...args);
        };
      }
      function writeChunks(stream, buffer, offset, length, position) {
        var contents = stream.node.contents;
        if (position >= contents.length) return 0;
        var size = Math.min(contents.length - position, length);
        if (contents.slice) {
          for (var i = 0; i < size; i++) {
            buffer[offset + i] = contents[position + i];
          }
        } else {
          for (var i = 0; i < size; i++) {
            buffer[offset + i] = contents.get(position + i);
          }
        }
        return size;
      }
      stream_ops.read = (stream, buffer, offset, length, position) => {
        FS.forceLoadFile(node);
        return writeChunks(stream, buffer, offset, length, position);
      };
      stream_ops.mmap = (stream, length, position, prot, flags) => {
        FS.forceLoadFile(node);
        var ptr = mmapAlloc(length);
        if (!ptr) {
          throw new FS.ErrnoError(48);
        }
        writeChunks(stream, HEAP8, ptr, length, position);
        return { ptr, allocated: true };
      };
      node.stream_ops = stream_ops;
      return node;
    } };
    var HEAPU8;
    var UTF8ToString = (ptr, maxBytesToRead, ignoreNul) => ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead, ignoreNul) : "";
    var HEAPU32;
    var HEAP64;
    var SYSCALLS = { currentUmask: 18, calculateAt(dirfd, path, allowEmpty) {
      if (PATH.isAbs(path)) {
        return path;
      }
      var dir;
      if (dirfd === -100) {
        dir = FS.cwd();
      } else {
        var dirstream = SYSCALLS.getStreamFromFD(dirfd);
        dir = dirstream.path;
      }
      if (path.length == 0) {
        if (!allowEmpty) {
          throw new FS.ErrnoError(44);
        }
        return dir;
      }
      return dir + "/" + path;
    }, writeStat(buf, stat) {
      HEAPU32[buf >> 2] = stat.dev;
      HEAPU32[buf + 4 >> 2] = stat.mode;
      HEAPU32[buf + 8 >> 2] = stat.nlink;
      HEAPU32[buf + 12 >> 2] = stat.uid;
      HEAPU32[buf + 16 >> 2] = stat.gid;
      HEAPU32[buf + 20 >> 2] = stat.rdev;
      HEAP64[buf + 24 >> 3] = BigInt(stat.size);
      HEAP32[buf + 32 >> 2] = 4096;
      HEAP32[buf + 36 >> 2] = stat.blocks;
      var atime = stat.atime.getTime();
      var mtime = stat.mtime.getTime();
      var ctime = stat.ctime.getTime();
      HEAP64[buf + 40 >> 3] = BigInt(Math.floor(atime / 1e3));
      HEAPU32[buf + 48 >> 2] = atime % 1e3 * 1e3 * 1e3;
      HEAP64[buf + 56 >> 3] = BigInt(Math.floor(mtime / 1e3));
      HEAPU32[buf + 64 >> 2] = mtime % 1e3 * 1e3 * 1e3;
      HEAP64[buf + 72 >> 3] = BigInt(Math.floor(ctime / 1e3));
      HEAPU32[buf + 80 >> 2] = ctime % 1e3 * 1e3 * 1e3;
      HEAP64[buf + 88 >> 3] = BigInt(stat.ino);
      return 0;
    }, writeStatFs(buf, stats) {
      HEAPU32[buf + 4 >> 2] = stats.bsize;
      HEAPU32[buf + 60 >> 2] = stats.bsize;
      HEAP64[buf + 8 >> 3] = BigInt(stats.blocks);
      HEAP64[buf + 16 >> 3] = BigInt(stats.bfree);
      HEAP64[buf + 24 >> 3] = BigInt(stats.bavail);
      HEAP64[buf + 32 >> 3] = BigInt(stats.files);
      HEAP64[buf + 40 >> 3] = BigInt(stats.ffree);
      HEAPU32[buf + 48 >> 2] = stats.fsid;
      HEAPU32[buf + 64 >> 2] = stats.flags;
      HEAPU32[buf + 56 >> 2] = stats.namelen;
    }, doMsync(addr, stream, len, flags, offset) {
      if (!FS.isFile(stream.node.mode)) {
        throw new FS.ErrnoError(43);
      }
      if (flags & 2) {
        return 0;
      }
      var buffer = HEAPU8.subarray(addr, addr + len);
      FS.msync(stream, buffer, offset, len, flags);
    }, getStreamFromFD(fd) {
      var stream = FS.getStreamChecked(fd);
      return stream;
    }, varargs: void 0, getStr(ptr) {
      var ret = UTF8ToString(ptr);
      return ret;
    } };
    var HEAP16;
    function ___syscall_fcntl64(fd, cmd, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        switch (cmd) {
          case 0: {
            var arg = syscallGetVarargI();
            if (arg < 0) {
              return -28;
            }
            while (FS.streams[arg]) {
              arg++;
            }
            var newStream;
            newStream = FS.dupStream(stream, arg);
            return newStream.fd;
          }
          case 1:
          case 2:
            return 0;
          case 3:
            return stream.flags;
          case 4: {
            var arg = syscallGetVarargI();
            var mask = 289792;
            stream.flags = stream.flags & ~mask | arg & mask;
            return 0;
          }
          case 12: {
            var arg = syscallGetVarargP();
            var offset = 0;
            HEAP16[arg + offset >> 1] = 2;
            return 0;
          }
          case 13:
          case 14:
            return 0;
        }
        return -28;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    var stringToUTF8 = (str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    function ___syscall_getdents64(fd, dirp, count) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        stream.getdents || (stream.getdents = FS.readdir(stream.path));
        var struct_size = 280;
        var pos = 0;
        var off = FS.llseek(stream, 0, 1);
        var startIdx = Math.floor(off / struct_size);
        var endIdx = Math.min(stream.getdents.length, startIdx + Math.floor(count / struct_size));
        for (var idx = startIdx; idx < endIdx; idx++) {
          var id;
          var type;
          var name = stream.getdents[idx];
          if (name === ".") {
            id = stream.node.id;
            type = 4;
          } else if (name === "..") {
            var lookup = FS.lookupPath(stream.path, { parent: true });
            id = lookup.node.id;
            type = 4;
          } else {
            var child;
            try {
              child = FS.lookupNode(stream.node, name);
            } catch (e) {
              if (e?.errno === 28) {
                continue;
              }
              throw e;
            }
            id = child.id;
            type = FS.isChrdev(child.mode) ? 2 : FS.isDir(child.mode) ? 4 : FS.isLink(child.mode) ? 10 : 8;
          }
          HEAP64[dirp + pos >> 3] = BigInt(id);
          HEAP64[dirp + pos + 8 >> 3] = BigInt((idx + 1) * struct_size);
          HEAP16[dirp + pos + 16 >> 1] = 280;
          HEAP8[dirp + pos + 18] = type;
          stringToUTF8(name, dirp + pos + 19, 256);
          pos += struct_size;
        }
        FS.llseek(stream, idx * struct_size, 0);
        return pos;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    function ___syscall_ioctl(fd, op, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        switch (op) {
          case 21509: {
            if (!stream.tty) return -59;
            return 0;
          }
          case 21505: {
            if (!stream.tty) return -59;
            if (stream.tty.ops.ioctl_tcgets) {
              var termios = stream.tty.ops.ioctl_tcgets(stream);
              var argp = syscallGetVarargP();
              HEAP32[argp >> 2] = termios.c_iflag || 0;
              HEAP32[argp + 4 >> 2] = termios.c_oflag || 0;
              HEAP32[argp + 8 >> 2] = termios.c_cflag || 0;
              HEAP32[argp + 12 >> 2] = termios.c_lflag || 0;
              for (var i = 0; i < 32; i++) {
                HEAP8[argp + i + 17] = termios.c_cc[i] || 0;
              }
              return 0;
            }
            return 0;
          }
          case 21510:
          case 21511:
          case 21512: {
            if (!stream.tty) return -59;
            return 0;
          }
          case 21506:
          case 21507:
          case 21508: {
            if (!stream.tty) return -59;
            if (stream.tty.ops.ioctl_tcsets) {
              var argp = syscallGetVarargP();
              var c_iflag = HEAP32[argp >> 2];
              var c_oflag = HEAP32[argp + 4 >> 2];
              var c_cflag = HEAP32[argp + 8 >> 2];
              var c_lflag = HEAP32[argp + 12 >> 2];
              var c_cc = [];
              for (var i = 0; i < 32; i++) {
                c_cc.push(HEAP8[argp + i + 17]);
              }
              return stream.tty.ops.ioctl_tcsets(stream.tty, op, { c_iflag, c_oflag, c_cflag, c_lflag, c_cc });
            }
            return 0;
          }
          case 21519: {
            if (!stream.tty) return -59;
            var argp = syscallGetVarargP();
            HEAP32[argp >> 2] = 0;
            return 0;
          }
          case 21520: {
            if (!stream.tty) return -59;
            return -28;
          }
          case 21537:
          case 21531: {
            var argp = syscallGetVarargP();
            return FS.ioctl(stream, op, argp);
          }
          case 21523: {
            if (!stream.tty) return -59;
            if (stream.tty.ops.ioctl_tiocgwinsz) {
              var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
              var argp = syscallGetVarargP();
              HEAP16[argp >> 1] = winsize[0];
              HEAP16[argp + 2 >> 1] = winsize[1];
            }
            return 0;
          }
          case 21524: {
            if (!stream.tty) return -59;
            return 0;
          }
          case 21515: {
            if (!stream.tty) return -59;
            return 0;
          }
          default:
            return -28;
        }
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    function ___syscall_openat(dirfd, path, flags, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        var mode = varargs ? syscallGetVarargI() : 0;
        if (flags & 64) {
          mode &= ~SYSCALLS.currentUmask;
        }
        return FS.open(path, flags, mode).fd;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    function ___syscall_rmdir(path) {
      try {
        path = SYSCALLS.getStr(path);
        FS.rmdir(path);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    function ___syscall_stat64(path, buf) {
      try {
        path = SYSCALLS.getStr(path);
        return SYSCALLS.writeStat(buf, FS.stat(path));
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    function ___syscall_unlinkat(dirfd, path, flags) {
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        if (!flags) {
          FS.unlink(path);
        } else if (flags === 512) {
          FS.rmdir(path);
        } else {
          return -28;
        }
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    var _emscripten_get_now = () => performance.now();
    var _emscripten_date_now = () => Date.now();
    var nowIsMonotonic = 1;
    var checkWasiClock = (clock_id) => clock_id >= 0 && clock_id <= 3;
    var INT53_MAX = 9007199254740992;
    var INT53_MIN = -9007199254740992;
    var bigintToI53Checked = (num) => num < INT53_MIN || num > INT53_MAX ? NaN : Number(num);
    function _clock_time_get(clk_id, ignored_precision, ptime) {
      ignored_precision = bigintToI53Checked(ignored_precision);
      if (!checkWasiClock(clk_id)) {
        return 28;
      }
      var now;
      if (clk_id === 0) {
        now = _emscripten_date_now();
      } else if (nowIsMonotonic) {
        now = _emscripten_get_now();
      } else {
        return 52;
      }
      var nsec = Math.round(now * 1e3 * 1e3);
      HEAP64[ptime >> 3] = BigInt(nsec);
      return 0;
    }
    var getHeapMax = () => 2147483648;
    var alignMemory = (size, alignment) => Math.ceil(size / alignment) * alignment;
    var growMemory = (size) => {
      var oldHeapSize = wasmMemory.buffer.byteLength;
      var pages = (size - oldHeapSize + 65535) / 65536 | 0;
      try {
        wasmMemory.grow(pages);
        updateMemoryViews();
        return 1;
      } catch (e) {
      }
    };
    var _emscripten_resize_heap = (requestedSize) => {
      var oldSize = HEAPU8.length;
      requestedSize >>>= 0;
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        return false;
      }
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = growMemory(newSize);
        if (replacement) {
          return true;
        }
      }
      return false;
    };
    var ENV = {};
    var getExecutableName = () => thisProgram;
    var getEnvStrings = () => {
      if (!getEnvStrings.strings) {
        var lang = (globalThis.navigator?.language ?? "C").replace("-", "_") + ".UTF-8";
        var env = { USER: "web_user", LOGNAME: "web_user", PATH: "/", PWD: "/", HOME: "/home/web_user", LANG: lang, _: getExecutableName() };
        for (var x in ENV) {
          if (ENV[x] === void 0) delete env[x];
          else env[x] = ENV[x];
        }
        var strings = [];
        for (var x in env) {
          strings.push(`${x}=${env[x]}`);
        }
        getEnvStrings.strings = strings;
      }
      return getEnvStrings.strings;
    };
    var _environ_get = (__environ, environ_buf) => {
      var bufSize = 0;
      var envp = 0;
      for (var string of getEnvStrings()) {
        var ptr = environ_buf + bufSize;
        HEAPU32[__environ + envp >> 2] = ptr;
        bufSize += stringToUTF8(string, ptr, Infinity) + 1;
        envp += 4;
      }
      return 0;
    };
    var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
      var strings = getEnvStrings();
      HEAPU32[penviron_count >> 2] = strings.length;
      var bufSize = 0;
      for (var string of strings) {
        bufSize += lengthBytesUTF8(string) + 1;
      }
      HEAPU32[penviron_buf_size >> 2] = bufSize;
      return 0;
    };
    var runtimeKeepaliveCounter = 0;
    var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
    var _proc_exit = (code) => {
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        Module2["onExit"]?.(code);
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    };
    var exitJS = (status, implicit) => {
      EXITSTATUS = status;
      _proc_exit(status);
    };
    var _exit = exitJS;
    function _fd_close(fd) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.close(stream);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    var doReadv = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        iov += 8;
        try {
          var curr = FS.read(stream, HEAP8, ptr, len, offset);
        } catch (e) {
          if (ret > 0 && e instanceof FS.ErrnoError && (e.errno == 6 || e.errno == 6)) {
            break;
          }
          throw e;
        }
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break;
        if (typeof offset != "undefined") {
          offset += curr;
        }
      }
      return ret;
    };
    function _fd_read(fd, iov, iovcnt, pnum) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doReadv(stream, iov, iovcnt);
        HEAPU32[pnum >> 2] = num;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    function _fd_seek(fd, offset, whence, newOffset) {
      offset = bigintToI53Checked(offset);
      try {
        if (isNaN(offset)) return 22;
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.llseek(stream, offset, whence);
        HEAP64[newOffset >> 3] = BigInt(stream.position);
        if (stream.getdents && !offset && whence === 0) stream.getdents = null;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    var doWritev = (stream, iov, iovcnt, offset) => {
      if (iovcnt == 1) {
        return FS.write(stream, HEAP8, HEAPU32[iov >> 2], HEAPU32[iov + 4 >> 2], offset);
      }
      var total = 0;
      for (var i = 0, p = iov; i < iovcnt; i++, p += 8) {
        total += HEAPU32[p + 4 >> 2];
      }
      var view = new Uint8Array(total);
      var voff = 0;
      for (var i = 0; i < iovcnt; i++, iov += 8) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        view.set(HEAPU8.subarray(ptr, ptr + len), voff);
        voff += len;
      }
      return FS.write(stream, view, 0, total, offset);
    };
    function _fd_write(fd, iov, iovcnt, pnum) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doWritev(stream, iov, iovcnt);
        HEAPU32[pnum >> 2] = num;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    var getCFunc = (ident) => {
      var func = Module2["_" + ident];
      return func;
    };
    var writeArrayToMemory = (array, buffer) => {
      HEAP8.set(array, buffer);
    };
    var stackAlloc = (sz) => __emscripten_stack_alloc(sz);
    var stringToUTF8OnStack = (str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8(str, ret, size);
      return ret;
    };
    var ccall = (ident, returnType, argTypes, args, opts) => {
      var toC = { string: (str) => {
        var ret2 = 0;
        if (str !== null && str !== void 0 && str !== 0) {
          ret2 = stringToUTF8OnStack(str);
        }
        return ret2;
      }, array: (arr) => {
        var ret2 = stackAlloc(arr.length);
        writeArrayToMemory(arr, ret2);
        return ret2;
      } };
      function convertReturnValue(ret2) {
        if (returnType === "string") {
          return UTF8ToString(ret2);
        }
        if (returnType === "boolean") return Boolean(ret2);
        return ret2;
      }
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (!stack) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var ret = func(...cArgs);
      function onDone(ret2) {
        if (stack) stackRestore(stack);
        return convertReturnValue(ret2);
      }
      ret = onDone(ret);
      return ret;
    };
    var cwrap = (ident, returnType, argTypes, opts) => {
      var numericArgs = !argTypes || argTypes.every((type) => type === "number" || type === "boolean");
      var numericRet = returnType !== "string";
      if (numericRet && numericArgs && !opts) {
        return getCFunc(ident);
      }
      return (...args) => ccall(ident, returnType, argTypes, args, opts);
    };
    var HEAPF32;
    var HEAPF64;
    function getValue(ptr, type = "i8") {
      if (type.endsWith("*")) type = "*";
      switch (type) {
        case "i1":
          return HEAP8[ptr];
        case "i8":
          return HEAP8[ptr];
        case "i16":
          return HEAP16[ptr >> 1];
        case "i32":
          return HEAP32[ptr >> 2];
        case "i64":
          return HEAP64[ptr >> 3];
        case "float":
          return HEAPF32[ptr >> 2];
        case "double":
          return HEAPF64[ptr >> 3];
        case "*":
          return HEAPU32[ptr >> 2];
        default:
          abort(`invalid type for getValue: ${type}`);
      }
    }
    function setValue(ptr, value, type = "i8") {
      if (type.endsWith("*")) type = "*";
      switch (type) {
        case "i1":
          HEAP8[ptr] = value;
          break;
        case "i8":
          HEAP8[ptr] = value;
          break;
        case "i16":
          HEAP16[ptr >> 1] = value;
          break;
        case "i32":
          HEAP32[ptr >> 2] = value;
          break;
        case "i64":
          HEAP64[ptr >> 3] = BigInt(value);
          break;
        case "float":
          HEAPF32[ptr >> 2] = value;
          break;
        case "double":
          HEAPF64[ptr >> 3] = value;
          break;
        case "*":
          HEAPU32[ptr >> 2] = value;
          break;
        default:
          abort(`invalid type for setValue: ${type}`);
      }
    }
    var FS_createPath = (...args) => FS.createPath(...args);
    var FS_unlink = (...args) => FS.unlink(...args);
    var FS_createLazyFile = (...args) => FS.createLazyFile(...args);
    var FS_createDevice = (...args) => FS.createDevice(...args);
    FS.createPreloadedFile = FS_createPreloadedFile;
    FS.preloadFile = FS_preloadFile;
    FS.staticInit();
    {
      if (Module2["noExitRuntime"]) noExitRuntime = Module2["noExitRuntime"];
      if (Module2["print"]) out = Module2["print"];
      if (Module2["printErr"]) err = Module2["printErr"];
      if (Module2["arguments"]) programArgs = Module2["arguments"];
      if (Module2["thisProgram"]) thisProgram = Module2["thisProgram"];
      var preInit = Module2["preInit"];
      if (preInit) {
        if (typeof preInit == "function") Module2["preInit"] = preInit = [preInit];
        while (preInit.length > 0) {
          preInit.shift()();
        }
      }
    }
    Module2["addRunDependency"] = addRunDependency;
    Module2["removeRunDependency"] = removeRunDependency;
    Module2["ccall"] = ccall;
    Module2["cwrap"] = cwrap;
    Module2["setValue"] = setValue;
    Module2["getValue"] = getValue;
    Module2["UTF8ToString"] = UTF8ToString;
    Module2["stringToUTF8"] = stringToUTF8;
    Module2["lengthBytesUTF8"] = lengthBytesUTF8;
    Module2["FS_preloadFile"] = FS_preloadFile;
    Module2["FS_unlink"] = FS_unlink;
    Module2["FS_createPath"] = FS_createPath;
    Module2["FS_createDevice"] = FS_createDevice;
    Module2["FS"] = FS;
    Module2["FS_createDataFile"] = FS_createDataFile;
    Module2["FS_createLazyFile"] = FS_createLazyFile;
    var _espeak_ListVoices, _espeak_TextToPhonemesWithTerminator, _espeak_Initialize, _espeak_SetVoiceByName, _espeak_Terminate, _malloc, _free, __emscripten_stack_restore, __emscripten_stack_alloc, _emscripten_stack_get_current, memory, __indirect_function_table, wasmMemory;
    function assignWasmExports(wasmExports2) {
      _espeak_ListVoices = Module2["_espeak_ListVoices"] = wasmExports2["t"];
      _espeak_TextToPhonemesWithTerminator = Module2["_espeak_TextToPhonemesWithTerminator"] = wasmExports2["u"];
      _espeak_Initialize = Module2["_espeak_Initialize"] = wasmExports2["v"];
      _espeak_SetVoiceByName = Module2["_espeak_SetVoiceByName"] = wasmExports2["w"];
      _espeak_Terminate = Module2["_espeak_Terminate"] = wasmExports2["x"];
      _malloc = Module2["_malloc"] = wasmExports2["y"];
      _free = Module2["_free"] = wasmExports2["z"];
      __emscripten_stack_restore = wasmExports2["A"];
      __emscripten_stack_alloc = wasmExports2["B"];
      _emscripten_stack_get_current = wasmExports2["C"];
      memory = wasmMemory = wasmExports2["r"];
      __indirect_function_table = wasmExports2["__indirect_function_table"];
    }
    var wasmImports = { c: ___syscall_fcntl64, l: ___syscall_getdents64, g: ___syscall_ioctl, d: ___syscall_openat, m: ___syscall_rmdir, h: ___syscall_stat64, n: ___syscall_unlinkat, o: _clock_time_get, i: _emscripten_date_now, p: _emscripten_resize_heap, j: _environ_get, k: _environ_sizes_get, q: _exit, a: _fd_close, e: _fd_read, f: _fd_seek, b: _fd_write };
    async function run() {
      preRun();
      if (runDependencies) {
        await resolveRunDependencies();
      }
      var setStatus = Module2["setStatus"];
      if (setStatus) {
        setStatus("Running...");
        await new Promise((resolve) => setTimeout(resolve, 1));
        setTimeout(setStatus, 1, "");
      }
      if (ABORT) return;
      initRuntime();
      Module2["onRuntimeInitialized"]?.();
      postRun();
    }
    var wasmExports;
    wasmExports = await createWasm();
    await run();
    ;
    return Module2;
  }
  var espeak_ng_default = createEspeakModule;

  // node_modules/espeak-phonemizer/dist/constants.mjs
  var espeakCHARS_AUTO = 0;
  var espeakPHONEMES_IPA = 2;
  var AUDIO_OUTPUT_SYNCHRONOUS = 2;
  var CLAUSE_TYPE_SENTENCE = 524288;
  var CLAUSE_PERIOD = 524328;
  var CLAUSE_COMMA = 266260;
  var CLAUSE_QUESTION = 532520;
  var CLAUSE_EXCLAMATION = 536621;
  var CLAUSE_COLON = 262174;
  var CLAUSE_SEMICOLON = 266270;
  var CLAUSE_TERMINATOR_MASK = 1048575;
  var TERMINATOR_STRINGS = /* @__PURE__ */ new Map([
    [CLAUSE_PERIOD, "."],
    [CLAUSE_QUESTION, "?"],
    [CLAUSE_EXCLAMATION, "!"],
    [CLAUSE_COMMA, ","],
    [CLAUSE_COLON, ":"],
    [CLAUSE_SEMICOLON, ";"]
  ]);
  function decodeTerminator(terminator) {
    const masked = terminator & CLAUSE_TERMINATOR_MASK;
    return {
      terminator: TERMINATOR_STRINGS.get(masked) ?? "",
      isSentenceEnd: (masked & CLAUSE_TYPE_SENTENCE) === CLAUSE_TYPE_SENTENCE
    };
  }

  // node_modules/espeak-phonemizer/dist/version.mjs
  var PACKAGE_VERSION = "0.2.0";

  // node_modules/espeak-phonemizer/dist/espeak.mjs
  var import_meta2 = {};
  var ESPEAK_DATA_VIRTUAL_PATH = "/espeak-ng-data";
  var isNode = typeof globalThis.process?.versions?.node === "string" && globalThis.process?.type !== "renderer";
  var Module = null;
  var manifest = null;
  var espeak_SetVoiceByName = null;
  var espeak_TextToPhonemesWithTerminator = null;
  var russianLoaded = false;
  async function readAsset(source) {
    if (source instanceof Blob) {
      return new Uint8Array(await source.arrayBuffer());
    }
    if (isNode) {
      const { readFile } = await import("node:fs/promises");
      return new Uint8Array(await readFile(source));
    }
    const res = await fetch(source);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${source}: ${res.status} ${res.statusText}`);
    }
    return new Uint8Array(await res.arrayBuffer());
  }
  async function readJSON(source) {
    if (source && typeof source === "object" && !(source instanceof Blob)) {
      return source;
    }
    const bytes = await readAsset(source);
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  function resolveWasmLocation(source) {
    if (typeof source === "string") return source;
    if (source instanceof Blob) return URL.createObjectURL(source);
    throw new Error('initialize: "wasm" source must be a URL/path string or a Blob');
  }
  function virtualDirname(virtualPath) {
    const idx = virtualPath.lastIndexOf("/");
    return idx <= 0 ? "/" : virtualPath.slice(0, idx);
  }
  function mountBucket(bucket, bytes) {
    for (const [relPath, { offset, length }] of Object.entries(bucket.files)) {
      const virtualPath = `${ESPEAK_DATA_VIRTUAL_PATH}/${relPath}`;
      Module.FS.mkdirTree(virtualDirname(virtualPath));
      Module.FS.writeFile(virtualPath, bytes.subarray(offset, offset + length));
    }
  }
  async function defaultDistDir() {
    if (!isNode) {
      return "";
    }
    const { fileURLToPath } = await import("node:url");
    return fileURLToPath(new URL("../dist", import_meta2.url));
  }
  function sourcesForBase(base) {
    return {
      wasm: `${base}/wasm/espeak-ng.wasm`,
      manifest: `${base}/data/manifest.json`,
      data: `${base}/data/data.data`,
      ru: `${base}/data/ru.data`
    };
  }
  async function initialize(dataDir, includeRussian = false) {
    if (Module) return;
    let sources;
    if (dataDir && typeof dataDir === "object") {
      sources = dataDir;
      for (const required of ["wasm", "manifest", "data"]) {
        if (!sources[required]) {
          throw new Error(`initialize: dataDir object is missing required "${required}" source`);
        }
      }
      manifest = await readJSON(sources.manifest);
    } else {
      let base = dataDir || (await defaultDistDir()).replace(/\/+$/, "");
      sources = sourcesForBase(base);
      try {
        manifest = await readJSON(sources.manifest);
      } catch {
        base = `https://cdn.jsdelivr.net/npm/espeak-phonemizer@${PACKAGE_VERSION}/dist`;
        sources = sourcesForBase(base);
        manifest = await readJSON(sources.manifest);
      }
    }
    const loadedModule = await espeak_ng_default({
      locateFile: () => resolveWasmLocation(sources.wasm)
    });
    Module = loadedModule;
    const dataBytes = await readAsset(sources.data);
    mountBucket(manifest.data, dataBytes);
    if (includeRussian) {
      if (!sources.ru) {
        throw new Error('initialize: includeRussian is true but no "ru" data source was provided');
      }
      const ruBytes = await readAsset(sources.ru);
      mountBucket(manifest.ru, ruBytes);
      russianLoaded = true;
    }
    const init = Module.cwrap("espeak_Initialize", "number", ["number", "number", "string", "number"]);
    const rc = init(AUDIO_OUTPUT_SYNCHRONOUS, 0, ESPEAK_DATA_VIRTUAL_PATH, 0);
    if (rc < 0) {
      throw new Error("Failed to initialize espeak-ng");
    }
    espeak_SetVoiceByName = Module.cwrap("espeak_SetVoiceByName", "number", ["string"]);
    espeak_TextToPhonemesWithTerminator = Module.cwrap(
      "espeak_TextToPhonemesWithTerminator",
      "string",
      ["number", "number", "number", "number"]
    );
  }
  function requireInitialized() {
    if (!Module) {
      throw new Error("espeak-ng is not initialized \u2014 call initialize(dataDir) first.");
    }
  }
  async function setVoice(voice) {
    requireInitialized();
    if (!manifest.voices.includes(voice)) {
      throw new Error(`Unknown or unbundled voice: ${voice}`);
    }
    if (manifest.russianVoices.includes(voice) && !russianLoaded) {
      throw new Error(`Voice "${voice}" requires Russian data, which was not loaded \u2014 pass includeRussian: true to initialize().`);
    }
    if (espeak_SetVoiceByName(voice) !== 0) {
      throw new Error(`Failed to set voice: ${voice}`);
    }
  }
  function getPhonemes(text) {
    requireInitialized();
    const bytes = Module.lengthBytesUTF8(text) + 1;
    const textPtr = Module._malloc(bytes);
    Module.stringToUTF8(text, textPtr, bytes);
    const textPtrCell = Module._malloc(4);
    Module.setValue(textPtrCell, textPtr, "i32");
    const terminatorCell = Module._malloc(4);
    const results = [];
    try {
      while (Module.getValue(textPtrCell, "i32") !== 0) {
        const phonemes = espeak_TextToPhonemesWithTerminator(
          textPtrCell,
          espeakCHARS_AUTO,
          espeakPHONEMES_IPA,
          terminatorCell
        );
        const terminator = Module.getValue(terminatorCell, "i32");
        results.push({ phonemes: phonemes ?? "", ...decodeTerminator(terminator) });
      }
    } finally {
      Module._free(textPtr);
      Module._free(textPtrCell);
      Module._free(terminatorCell);
    }
    return results;
  }

  // src/services/tts/phonemizer/piperTokenizer.ts
  var PHONEME_VARIANT_MAP = {
    // Punctuation variants
    "\u060C": ",",
    "\u061B": ";",
    "\u061F": "?",
    "\u06D4": ".",
    "\xAB": '"',
    "\xBB": '"',
    "\u201C": '"',
    "\u201D": '"',
    "\u2018": "'",
    "\u2019": "'",
    "\u2014": "-",
    "\u2013": "-",
    // Phonetic symbol variants
    "g": "\u0261"
    // ASCII g to IPA script ɡ
  };
  function getSymbolTokenId(phonemeIdMap, symbol) {
    const entry = phonemeIdMap[symbol];
    if (typeof entry === "number") return entry;
    if (Array.isArray(entry) && entry.length > 0) return entry[0];
    const variant = PHONEME_VARIANT_MAP[symbol];
    if (variant && phonemeIdMap[variant] !== void 0) {
      const varEntry = phonemeIdMap[variant];
      if (typeof varEntry === "number") return varEntry;
      if (Array.isArray(varEntry) && varEntry.length > 0) return varEntry[0];
    }
    return void 0;
  }
  function phonemesToPiperTokens(phonemeString, phonemeIdMap, options = {}) {
    if (!phonemeString || !phonemeIdMap) {
      return [];
    }
    const bosToken = options.bosToken ?? getSymbolTokenId(phonemeIdMap, "^") ?? 1;
    const eosToken = options.eosToken ?? getSymbolTokenId(phonemeIdMap, "$") ?? 2;
    const padToken = options.padToken ?? getSymbolTokenId(phonemeIdMap, "_") ?? 0;
    const interspersePad = options.interspersePad ?? true;
    const validTokenIds = [];
    for (let i = 0; i < phonemeString.length; i++) {
      const char = phonemeString[i];
      if (char === "\u200C" || char === "\u200B" || char === "\uFEFF") {
        continue;
      }
      const id = getSymbolTokenId(phonemeIdMap, char);
      if (id !== void 0) {
        validTokenIds.push(id);
      } else {
        options.onUnknownPhoneme?.(char);
        console.warn(
          `[PiperTokenizer] Unknown phoneme symbol "${char}" (U+${char.charCodeAt(0).toString(16).toUpperCase()}) omitted`
        );
      }
    }
    const result = [bosToken];
    for (const id of validTokenIds) {
      if (interspersePad) {
        result.push(padToken);
      }
      result.push(id);
    }
    if (interspersePad) {
      result.push(padToken);
    }
    result.push(eosToken);
    return result;
  }

  // src/services/tts/phonemizer/espeakPhonemizer.ts
  var EspeakFarsiPhonemizer = class {
    constructor() {
      this.voice = "fa";
      this.isInitialized = false;
      this.initPromise = null;
    }
    isReady() {
      return this.isInitialized;
    }
    async init() {
      if (this.isInitialized) return true;
      if (this.initPromise) return this.initPromise;
      this.initPromise = (async () => {
        try {
          const isNode2 = typeof process !== "undefined" && process.versions && process.versions.node;
          if (isNode2) {
            await initialize();
          } else {
            const isExtension = typeof chrome !== "undefined" && !!chrome.runtime?.getURL;
            const base = isExtension ? chrome.runtime.getURL("espeak-data") : "/espeak-data";
            try {
              await initialize(base);
            } catch (initErr) {
              console.warn("Initial espeak data path failed, trying relative ./espeak-data:", initErr);
              await initialize("./espeak-data");
            }
          }
          await setVoice(this.voice);
          this.isInitialized = true;
          console.log("\u2713 eSpeak NG Farsi Phonemizer initialized successfully (voice: fa)");
          return true;
        } catch (err) {
          console.error("Failed to initialize eSpeak NG Farsi phonemizer:", err);
          this.isInitialized = false;
          return false;
        } finally {
          this.initPromise = null;
        }
      })();
      return this.initPromise;
    }
    /**
     * Convert normalized Persian text into an eSpeak IPA phoneme string.
     */
    async phonemize(text) {
      const normalized = normalizePersianText(text);
      if (!normalized) return "";
      const ready = await this.init();
      if (!ready) {
        throw new Error("eSpeak NG Farsi Phonemizer is not initialized");
      }
      try {
        const clauses = getPhonemes(normalized);
        if (!clauses || clauses.length === 0) {
          return "";
        }
        const phonemeParts = clauses.map((c) => {
          const p = (c.phonemes || "").trim();
          const term = (c.terminator || "").trim();
          return term ? `${p}${term}` : p;
        });
        return phonemeParts.filter(Boolean).join(" ").trim();
      } catch (err) {
        console.error("eSpeak NG phonemization error for Persian text:", err);
        throw err;
      }
    }
    /**
     * Convert Persian text directly into Piper token IDs using model's phoneme_id_map.
     */
    async phonemizeToTokens(text, phonemeIdMap, options) {
      if (!text) return [];
      if (!phonemeIdMap) {
        throw new Error("phonemizeToTokens requires a valid model phoneme_id_map");
      }
      const phonemes = await this.phonemize(text);
      return phonemesToPiperTokens(phonemes, phonemeIdMap, options);
    }
  };
  var farsiPhonemizer = new EspeakFarsiPhonemizer();

  // src/services/tts/audioUtils.ts
  function encodePcmWavBuffer(samples, sampleRate = 22050) {
    if (!samples) {
      throw new Error("WAV encoding failed: samples parameter is null or undefined");
    }
    if (typeof sampleRate !== "number" || sampleRate <= 0 || !Number.isFinite(sampleRate)) {
      throw new Error(`WAV encoding failed: invalid sample rate (${sampleRate})`);
    }
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const sampleCount = samples.length;
    const dataSize = sampleCount * bytesPerSample;
    const totalBufferSize = 44 + dataSize;
    const buffer = new ArrayBuffer(totalBufferSize);
    const view = new DataView(buffer);
    view.setUint8(0, 82);
    view.setUint8(1, 73);
    view.setUint8(2, 70);
    view.setUint8(3, 70);
    view.setUint32(4, 36 + dataSize, true);
    view.setUint8(8, 87);
    view.setUint8(9, 65);
    view.setUint8(10, 86);
    view.setUint8(11, 69);
    view.setUint8(12, 102);
    view.setUint8(13, 109);
    view.setUint8(14, 116);
    view.setUint8(15, 32);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, Math.round(sampleRate), true);
    view.setUint32(28, Math.round(byteRate), true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    view.setUint8(36, 100);
    view.setUint8(37, 97);
    view.setUint8(38, 116);
    view.setUint8(39, 97);
    view.setUint32(40, dataSize, true);
    let offset = 44;
    const isInt16Array = samples instanceof Int16Array;
    for (let i = 0; i < sampleCount; i++) {
      if (isInt16Array) {
        const s = samples[i];
        const clamped = Math.max(-32768, Math.min(32767, s));
        view.setInt16(offset, clamped, true);
      } else {
        const s = Number(samples[i]);
        const clamped = Math.max(-1, Math.min(1, isNaN(s) ? 0 : s));
        const intSample = clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767);
        view.setInt16(offset, intSample, true);
      }
      offset += 2;
    }
    return buffer;
  }
  function encodePcmWav(samples, sampleRate = 22050) {
    const buffer = encodePcmWavBuffer(samples, sampleRate);
    return new Blob([buffer], { type: "audio/wav" });
  }
  function extractPiperAudioSamples(outputTensor) {
    if (!outputTensor) {
      throw new Error("Invalid Piper output tensor: output tensor is null or undefined");
    }
    const data = outputTensor.data;
    if (!data || typeof data.length !== "number") {
      throw new Error("Invalid Piper output tensor: tensor data is missing or empty");
    }
    if (data.length === 0) {
      return new Float32Array(0);
    }
    if (data instanceof Float32Array) {
      return data;
    }
    if (data instanceof Int16Array) {
      return data;
    }
    const floatArray = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      floatArray[i] = Number(data[i]);
    }
    return floatArray;
  }
  function validateWavBuffer(buffer) {
    if (!buffer) {
      return { valid: false, error: "Empty buffer provided" };
    }
    const ab = buffer instanceof Uint8Array ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) : buffer;
    if (ab.byteLength < 44) {
      return { valid: false, error: `Buffer size (${ab.byteLength}) is smaller than 44-byte WAV header` };
    }
    const view = new DataView(ab);
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    if (riff !== "RIFF") {
      return { valid: false, error: `Invalid RIFF magic bytes: expected 'RIFF', got '${riff}'` };
    }
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    if (wave !== "WAVE") {
      return { valid: false, error: `Invalid WAVE magic bytes: expected 'WAVE', got '${wave}'` };
    }
    const fmt = String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15));
    if (fmt !== "fmt ") {
      return { valid: false, error: `Missing 'fmt ' chunk: got '${fmt}'` };
    }
    const audioFormat = view.getUint16(20, true);
    if (audioFormat !== 1) {
      return { valid: false, error: `Non-PCM audio format (${audioFormat})` };
    }
    const numChannels = view.getUint16(22, true);
    const sampleRate = view.getUint32(24, true);
    const bitsPerSample = view.getUint16(34, true);
    const dataTag = String.fromCharCode(view.getUint8(36), view.getUint8(37), view.getUint8(38), view.getUint8(39));
    if (dataTag !== "data") {
      return { valid: false, error: `Missing 'data' chunk: got '${dataTag}'` };
    }
    const dataByteLength = view.getUint32(40, true);
    if (44 + dataByteLength > ab.byteLength) {
      return {
        valid: false,
        error: `Declared data size (${dataByteLength}) exceeds buffer length (${ab.byteLength})`
      };
    }
    return {
      valid: true,
      numChannels,
      sampleRate,
      bitsPerSample,
      dataByteLength,
      totalByteLength: ab.byteLength
    };
  }
  async function playAudioBlob(blob, options = {}) {
    const volume = Math.max(0, Math.min(1, options.volume ?? 1));
    if (typeof window !== "undefined" && typeof window.Audio !== "undefined" && typeof URL !== "undefined") {
      try {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.volume = volume;
        let hasCleanedUp = false;
        const cleanup = (isExplicitStop = false) => {
          if (!hasCleanedUp) {
            hasCleanedUp = true;
            audio.onplay = null;
            audio.onended = null;
            audio.onerror = null;
            try {
              audio.pause();
              audio.currentTime = 0;
              audio.src = "";
            } catch {
            }
            try {
              URL.revokeObjectURL(url);
            } catch {
            }
          }
        };
        audio.onplay = () => {
          if (!hasCleanedUp) {
            options.onStart?.();
          }
        };
        audio.onended = () => {
          cleanup(false);
          options.onEnd?.();
        };
        audio.onerror = (e) => {
          cleanup(false);
          options.onError?.(new Error("Audio element playback error"));
        };
        await audio.play();
        return { stop: () => cleanup(true) };
      } catch (audioErr) {
        console.debug("HTML5 Audio playback failed, falling back to Web Audio:", audioErr);
      }
    }
    if (typeof window !== "undefined" || typeof globalThis.AudioContext !== "undefined") {
      try {
        const AudioContextClass = globalThis.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          const gain = ctx.createGain();
          gain.gain.value = volume;
          source.connect(gain);
          gain.connect(ctx.destination);
          let isStopped = false;
          const stop = (isExplicitStop = false) => {
            if (!isStopped) {
              isStopped = true;
              source.onended = null;
              try {
                source.stop();
              } catch {
              }
              try {
                source.disconnect();
              } catch {
              }
              try {
                gain.disconnect();
              } catch {
              }
            }
          };
          source.onended = () => {
            stop(false);
            options.onEnd?.();
          };
          options.onStart?.();
          source.start(0);
          return { stop: () => stop(true) };
        }
      } catch (webAudioErr) {
        console.warn("Web Audio playback failed:", webAudioErr);
      }
    }
    options.onStart?.();
    options.onEnd?.();
    return { stop: () => {
    } };
  }

  // src/services/tts/espeakEngine.ts
  var import_meta4 = {};
  var EspeakEngine = class {
    constructor() {
      this.name = "eSpeak NG (WASM)";
      this.engineType = "espeak";
      this.voice = "fa";
      this.sampleRate = 22050;
      this.isCurrentlySpeaking = false;
      this.isInitialized = false;
      this.initPromise = null;
      this.cachedWasmBinary = null;
      this.currentPlaybackHandle = null;
    }
    /**
     * Initializes the eSpeak NG WebAssembly environment and prefetches wasm assets
     */
    async initialize() {
      if (this.isInitialized) return;
      if (this.initPromise) return this.initPromise;
      this.initPromise = (async () => {
        try {
          const isNode2 = typeof process !== "undefined" && !!process.versions?.node;
          const isExtension = typeof chrome !== "undefined" && !!chrome.runtime?.getURL;
          if (isNode2) {
            try {
              const fs = await import("node:fs");
              const { createRequire } = await import("node:module");
              const req = createRequire(import_meta4.url);
              const wasmPath = req.resolve("espeak-ng/dist/espeak-ng.wasm");
              if (fs.existsSync(wasmPath)) {
                const buf = fs.readFileSync(wasmPath);
                this.cachedWasmBinary = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
              }
            } catch {
            }
          } else if (typeof fetch === "function") {
            try {
              const wasmUrl = isExtension ? chrome.runtime.getURL("espeak-ng.wasm") : "/espeak-ng.wasm";
              const resp = await fetch(wasmUrl);
              if (resp.ok) {
                this.cachedWasmBinary = await resp.arrayBuffer();
              }
            } catch (fetchErr) {
              console.debug("Prefetching espeak-ng.wasm failed, falling back to dynamic locateFile:", fetchErr);
            }
          }
          await farsiPhonemizer.init();
          this.isInitialized = true;
          console.log("\u2713 Real eSpeak NG WASM Engine initialized successfully (voice: fa)");
        } catch (err) {
          console.error("Failed to initialize eSpeak NG WASM engine:", err);
          throw err;
        } finally {
          this.initPromise = null;
        }
      })();
      return this.initPromise;
    }
    async init() {
      try {
        await this.initialize();
        return true;
      } catch {
        return false;
      }
    }
    /**
     * Run an eSpeak NG WASM CLI invocation inside the WebAssembly sandbox
     */
    async runEspeakInstance(args) {
      const isNode2 = typeof process !== "undefined" && !!process.versions?.node;
      const isExtension = typeof chrome !== "undefined" && !!chrome.runtime?.getURL;
      const moduleConfig = {
        arguments: args,
        noInitialRun: false
      };
      if (this.cachedWasmBinary) {
        moduleConfig.wasmBinary = this.cachedWasmBinary;
      } else if (!isNode2) {
        const wasmUrl = isExtension ? chrome.runtime.getURL("espeak-ng.wasm") : "/espeak-ng.wasm";
        moduleConfig.locateFile = (file) => {
          if (file.endsWith(".wasm")) return wasmUrl;
          return file;
        };
      }
      const { default: ESpeakNG2 } = await Promise.resolve().then(() => (init_espeak_ng(), espeak_ng_exports));
      return await ESpeakNG2(moduleConfig);
    }
    /**
     * Operation A: Real eSpeak NG G2P Phonemization for Persian
     * Persian text -> eSpeak NG / fa -> IPA phoneme string
     */
    async phonemize(text) {
      const normalized = normalizePersianText(text);
      if (!normalized) return "";
      await this.initialize();
      try {
        return await farsiPhonemizer.phonemize(normalized);
      } catch {
        const es = await this.runEspeakInstance([
          "-v",
          this.voice,
          "--ipa=3",
          "-q",
          "--phonout=ph.txt",
          normalized
        ]);
        const phonemes = es.FS.readFile("ph.txt", { encoding: "utf8" }) || "";
        try {
          es.FS.unlink("ph.txt");
        } catch {
        }
        return phonemes.trim();
      }
    }
    /**
     * Operation B: Real eSpeak NG Audio Synthesis for Persian
     * Persian text -> eSpeak NG / fa -> WAV audio blob
     */
    async synthesize(text, options = {}) {
      const normalized = normalizePersianText(text);
      if (!normalized) {
        const emptyBlob = encodePcmWav(new Float32Array(0), this.sampleRate);
        return {
          success: true,
          wavBlob: emptyBlob,
          durationMs: 0,
          sampleRate: this.sampleRate,
          engineUsed: "espeak",
          fallbackTriggered: false
        };
      }
      await this.initialize();
      const speed = Math.max(0.5, Math.min(2, options.speed ?? 1));
      const pitch = Math.max(0.6, Math.min(1.4, options.pitch ?? 1));
      const volume = Math.max(0, Math.min(1, options.volume ?? 1));
      const speedWpm = Math.round(175 * speed);
      const pitchVal = Math.round(50 * pitch);
      const ampVal = Math.round(100 * volume);
      const outFileName = `out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.wav`;
      const args = [
        "-v",
        this.voice,
        "-s",
        speedWpm.toString(),
        "-p",
        pitchVal.toString(),
        "-a",
        ampVal.toString(),
        "-w",
        outFileName,
        normalized
      ];
      try {
        const es = await this.runEspeakInstance(args);
        const wavBytes = es.FS.readFile(outFileName);
        try {
          es.FS.unlink(outFileName);
        } catch {
        }
        const wavBlob = new Blob([wavBytes], { type: "audio/wav" });
        const samples = Math.max(0, (wavBytes.length - 44) / 2);
        const durationMs = Math.round(samples / this.sampleRate * 1e3);
        return {
          success: true,
          wavBlob,
          durationMs,
          sampleRate: this.sampleRate,
          engineUsed: "espeak",
          fallbackTriggered: false
        };
      } catch (err) {
        console.error("eSpeak NG WASM synthesis error:", err);
        return {
          success: false,
          wavBlob: encodePcmWav(new Float32Array(0), this.sampleRate),
          durationMs: 0,
          sampleRate: this.sampleRate,
          engineUsed: "espeak",
          fallbackTriggered: false,
          error: err?.message || "eSpeak NG WASM synthesis failed"
        };
      }
    }
    /**
     * Plays synthesized speech through browser audio output
     */
    async speak(text, options = {}) {
      this.stop();
      this.isCurrentlySpeaking = true;
      try {
        const res = await this.synthesize(text, options);
        if (!res.success) {
          this.isCurrentlySpeaking = false;
          options.onError?.(new Error(res.error || "eSpeak synthesis failed"));
          return;
        }
        this.currentPlaybackHandle = await playAudioBlob(res.wavBlob, {
          volume: options.volume ?? 1,
          onStart: () => {
            options.onStart?.();
          },
          onEnd: () => {
            this.isCurrentlySpeaking = false;
            this.currentPlaybackHandle = null;
            options.onEnd?.();
          },
          onError: (err) => {
            this.isCurrentlySpeaking = false;
            this.currentPlaybackHandle = null;
            options.onError?.(err);
          }
        });
      } catch (err) {
        this.isCurrentlySpeaking = false;
        this.currentPlaybackHandle = null;
        options.onError?.(err);
      }
    }
    /**
     * Helper to play an already-synthesized WAV blob
     */
    async playWavBlob(blob, options = {}) {
      this.stop();
      this.isCurrentlySpeaking = true;
      this.currentPlaybackHandle = await playAudioBlob(blob, {
        volume: options.volume ?? 1,
        onStart: () => {
          options.onStart?.();
        },
        onEnd: () => {
          this.isCurrentlySpeaking = false;
          this.currentPlaybackHandle = null;
          options.onEnd?.();
        },
        onError: (err) => {
          this.isCurrentlySpeaking = false;
          this.currentPlaybackHandle = null;
          options.onError?.(err);
        }
      });
    }
    /**
     * Stops any currently playing audio
     */
    stop() {
      if (this.currentPlaybackHandle) {
        try {
          this.currentPlaybackHandle.stop();
        } catch {
        }
        this.currentPlaybackHandle = null;
      }
      this.isCurrentlySpeaking = false;
    }
    /**
     * Disposes engine and releases audio resources
     */
    dispose() {
      this.stop();
      this.cachedWasmBinary = null;
      this.isInitialized = false;
    }
    isSpeaking() {
      return this.isCurrentlySpeaking;
    }
  };
  var espeakEngine = new EspeakEngine();

  // src/services/tts/modelValidation.ts
  function validatePiperModelBytes(bytes) {
    if (!bytes) {
      return { valid: false, error: "Model not found: ONNX bytes are null or undefined" };
    }
    const byteLength = bytes.byteLength;
    if (byteLength < 5e3) {
      return {
        valid: false,
        error: `Model file corrupt or incomplete: size is only ${byteLength} bytes (minimum 5KB required)`
      };
    }
    return { valid: true };
  }
  function validatePiperModelConfig(configInput, expectedVoice = "fa_IR-amir-medium") {
    if (!configInput) {
      return { valid: false, error: "Model config not found: configuration is missing" };
    }
    let config;
    if (typeof configInput === "string") {
      const trimmed = configInput.trim();
      if (!trimmed || trimmed === "{}") {
        return { valid: false, error: "Model config not found: configuration string is empty or blank JSON ({})" };
      }
      try {
        config = JSON.parse(trimmed);
      } catch (parseErr) {
        return {
          valid: false,
          error: `Model config invalid: failed to parse JSON (${parseErr?.message || "syntax error"})`
        };
      }
    } else if (typeof configInput === "object") {
      config = configInput;
    } else {
      return { valid: false, error: "Model config invalid: unexpected configuration type" };
    }
    if (!config || typeof config !== "object" || Object.keys(config).length === 0) {
      return { valid: false, error: "Model config invalid: empty configuration object ({})" };
    }
    const sampleRate = config.audio?.sample_rate;
    if (typeof sampleRate !== "number" || sampleRate <= 0 || !Number.isFinite(sampleRate)) {
      return {
        valid: false,
        error: "Model config invalid: audio.sample_rate missing or invalid (expected positive number)"
      };
    }
    if (!config.phoneme_type || typeof config.phoneme_type !== "string") {
      return {
        valid: false,
        error: 'Model config invalid: phoneme_type missing or invalid (expected string e.g. "espeak" or "text")'
      };
    }
    if (!config.phoneme_id_map || typeof config.phoneme_id_map !== "object" || Object.keys(config.phoneme_id_map).length === 0) {
      return {
        valid: false,
        error: "Model config invalid: phoneme_id_map missing or empty object"
      };
    }
    if (config.voice) {
      const voiceName = (config.voice.name || "").toLowerCase();
      const langCode = (config.voice.language?.code || config.voice.language?.family || "").toLowerCase();
      const expectedLower = expectedVoice.toLowerCase();
      if (expectedLower.includes("fa") || expectedLower.includes("amir")) {
        const isFarsiVoice = langCode.includes("fa") || voiceName.includes("amir") || config.espeak?.voice === "fa";
        if (!isFarsiVoice && voiceName && !expectedLower.includes(voiceName)) {
          return {
            valid: false,
            error: `Model config voice mismatch: config is for voice "${voiceName}" (${langCode}), expected "${expectedVoice}"`
          };
        }
      }
    }
    return {
      valid: true,
      config
    };
  }

  // src/services/tts/indexedDbModelStore.ts
  var DB_NAME = "AdhdReader_FarsiTTS_Models";
  var DB_VERSION = 1;
  var STORE_NAME = "models";
  var DEFAULT_PIPER_MODEL_NAME = "fa_IR-amir-medium";
  var PIPER_CACHE_VERSION = "v2.1.0";
  var MODEL_BASE_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main/fa/fa_IR/amir/medium";
  var ONNX_FILENAME = "fa_IR-amir-medium.onnx";
  var JSON_FILENAME = "fa_IR-amir-medium.onnx.json";
  var IndexedDbModelStore = class {
    constructor() {
      this.dbPromise = null;
      this.currentProgress = 0;
      this.currentStatus = "not_cached";
      this.listeners = /* @__PURE__ */ new Set();
    }
    getDB() {
      if (this.dbPromise) return this.dbPromise;
      this.dbPromise = new Promise((resolve, reject) => {
        if (typeof window === "undefined" || !window.indexedDB) {
          return reject(new Error("IndexedDB is not supported in this environment"));
        }
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "id" });
          }
        };
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          reject(request.error || new Error("Failed to open IndexedDB for Piper models"));
        };
      });
      return this.dbPromise;
    }
    subscribe(cb) {
      this.listeners.add(cb);
      this.checkCache().then(cb).catch(() => {
      });
      return () => this.listeners.delete(cb);
    }
    notify(info) {
      this.listeners.forEach((cb) => cb(info));
    }
    /**
     * Check if the Piper model is cached locally in IndexedDB
     */
    async checkCache(modelId = DEFAULT_PIPER_MODEL_NAME) {
      try {
        const db = await this.getDB();
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(modelId);
          req.onsuccess = () => {
            const record = req.result;
            if (record && record.onnxBytes) {
              if (record.cacheVersion !== PIPER_CACHE_VERSION) {
                console.warn(
                  `[IndexedDbModelStore] Evicting outdated Piper cache (version ${record.cacheVersion || "v1"} vs expected ${PIPER_CACHE_VERSION})`
                );
                try {
                  store.delete(modelId);
                } catch {
                }
                this.currentStatus = "not_cached";
                const info2 = {
                  status: "not_cached",
                  modelName: modelId,
                  sizeBytes: 0,
                  downloadProgress: 0,
                  cacheVersion: PIPER_CACHE_VERSION,
                  isOfflineReady: false
                };
                this.notify(info2);
                return resolve(info2);
              }
              const bytesValidation = validatePiperModelBytes(record.onnxBytes);
              const configValidation = validatePiperModelConfig(record.configJson, modelId);
              if (bytesValidation.valid && configValidation.valid) {
                this.currentStatus = "ready";
                this.errorMessage = void 0;
                this.errorCategory = void 0;
                const info2 = {
                  status: "ready",
                  modelName: record.modelName || modelId,
                  sizeBytes: record.sizeBytes || record.onnxBytes.byteLength,
                  downloadProgress: 100,
                  lastUpdated: record.timestamp,
                  cacheVersion: PIPER_CACHE_VERSION,
                  isOfflineReady: true
                };
                this.notify(info2);
                return resolve(info2);
              } else {
                this.currentStatus = "error";
                this.errorCategory = "PARSE_FAILED";
                this.errorMessage = bytesValidation.error || configValidation.error || "Corrupt model cache in IndexedDB";
                const info2 = {
                  status: "error",
                  modelName: modelId,
                  sizeBytes: 0,
                  downloadProgress: 0,
                  errorMessage: this.errorMessage,
                  errorCategory: "PARSE_FAILED",
                  cacheVersion: PIPER_CACHE_VERSION,
                  isOfflineReady: false
                };
                this.notify(info2);
                return resolve(info2);
              }
            }
            this.currentStatus = this.currentStatus === "downloading" ? "downloading" : "not_cached";
            const info = {
              status: this.currentStatus,
              modelName: modelId,
              sizeBytes: 0,
              downloadProgress: this.currentProgress,
              errorMessage: this.errorMessage,
              errorCategory: this.errorCategory,
              cacheVersion: PIPER_CACHE_VERSION,
              isOfflineReady: false
            };
            this.notify(info);
            resolve(info);
          };
          req.onerror = () => {
            this.currentStatus = "error";
            this.errorCategory = "STORAGE_FAILED";
            this.errorMessage = "Failed to read from IndexedDB";
            const info = {
              status: "error",
              modelName: modelId,
              sizeBytes: 0,
              downloadProgress: 0,
              errorMessage: this.errorMessage,
              errorCategory: "STORAGE_FAILED",
              cacheVersion: PIPER_CACHE_VERSION,
              isOfflineReady: false
            };
            this.notify(info);
            resolve(info);
          };
        });
      } catch (e) {
        const info = {
          status: "not_cached",
          modelName: modelId,
          sizeBytes: 0,
          downloadProgress: 0,
          errorMessage: e?.message,
          cacheVersion: PIPER_CACHE_VERSION,
          isOfflineReady: false
        };
        this.notify(info);
        return info;
      }
    }
    /**
     * Retrieve cached ONNX model and config from IndexedDB.
     * Strictly validates that both ONNX model and JSON config exist and are valid.
     * Never silently substitutes {} on config error.
     */
    async getModel(modelId = DEFAULT_PIPER_MODEL_NAME) {
      try {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readonly");
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(modelId);
          req.onsuccess = () => {
            const record = req.result;
            if (!record || !record.onnxBytes) {
              return resolve(null);
            }
            if (record.cacheVersion !== PIPER_CACHE_VERSION) {
              console.warn(`Piper cached model version mismatch (${record.cacheVersion} vs ${PIPER_CACHE_VERSION})`);
              return resolve(null);
            }
            const bytesValidation = validatePiperModelBytes(record.onnxBytes);
            if (!bytesValidation.valid) {
              console.error("Piper model bytes validation failed (parse failed):", bytesValidation.error);
              return resolve(null);
            }
            const configValidation = validatePiperModelConfig(record.configJson, modelId);
            if (!configValidation.valid || !configValidation.config) {
              console.error("Piper model config validation failed (parse failed):", configValidation.error);
              return resolve(null);
            }
            resolve({
              onnxBytes: record.onnxBytes,
              config: configValidation.config
            });
          };
          req.onerror = () => reject(req.error);
        });
      } catch (err) {
        console.warn("Error reading Piper model from IndexedDB:", err);
        return null;
      }
    }
    /**
     * Save model and config to IndexedDB after strict validation
     */
    async saveModel(modelId, onnxBytes, configJson) {
      try {
        const bytesValidation = validatePiperModelBytes(onnxBytes);
        if (!bytesValidation.valid) {
          throw new Error(`parse failed: ${bytesValidation.error}`);
        }
        const configValidation = validatePiperModelConfig(configJson, modelId);
        if (!configValidation.valid) {
          throw new Error(`parse failed: ${configValidation.error}`);
        }
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          const record = {
            id: modelId,
            modelName: modelId,
            cacheVersion: PIPER_CACHE_VERSION,
            onnxBytes,
            configJson,
            sizeBytes: onnxBytes.byteLength,
            timestamp: Date.now()
          };
          const req = store.put(record);
          req.onsuccess = () => {
            this.currentStatus = "ready";
            this.currentProgress = 100;
            this.errorMessage = void 0;
            this.errorCategory = void 0;
            this.notify({
              status: "ready",
              modelName: modelId,
              sizeBytes: onnxBytes.byteLength,
              downloadProgress: 100,
              cacheVersion: PIPER_CACHE_VERSION,
              isOfflineReady: true
            });
            resolve(true);
          };
          req.onerror = () => reject(req.error);
        });
      } catch (err) {
        console.error("Failed to save Piper model to IndexedDB:", err);
        return false;
      }
    }
    /**
     * Download model and persist in IndexedDB with real progress tracking.
     * Requires valid configuration and weights without silent fallbacks.
     */
    async downloadAndCacheModel(onProgress) {
      this.currentStatus = "downloading";
      this.currentProgress = 5;
      this.errorMessage = void 0;
      this.notify({
        status: "downloading",
        modelName: DEFAULT_PIPER_MODEL_NAME,
        sizeBytes: 0,
        downloadProgress: 5,
        isOfflineReady: false
      });
      onProgress?.(5);
      try {
        let configJsonStr = "";
        try {
          const localConfigRes = await fetch(`/${JSON_FILENAME}`);
          if (localConfigRes.ok) {
            configJsonStr = await localConfigRes.text();
          }
        } catch {
        }
        if (!configJsonStr) {
          const configUrl = `${MODEL_BASE_URL}/${JSON_FILENAME}`;
          let configRes;
          try {
            configRes = await fetch(configUrl);
          } catch (netErr) {
            const err = new Error(`download failed: network error fetching config from ${configUrl} (${netErr?.message})`);
            err.category = "DOWNLOAD_FAILED";
            throw err;
          }
          if (!configRes.ok) {
            const err = new Error(`download failed: HTTP ${configRes.status} fetching config from ${configUrl}`);
            err.category = "DOWNLOAD_FAILED";
            throw err;
          }
          configJsonStr = await configRes.text();
        }
        const configValidation = validatePiperModelConfig(configJsonStr, DEFAULT_PIPER_MODEL_NAME);
        if (!configValidation.valid) {
          const err = new Error(`parse failed: ${configValidation.error}`);
          err.category = "PARSE_FAILED";
          throw err;
        }
        this.currentProgress = 15;
        onProgress?.(15);
        this.notify({
          status: "downloading",
          modelName: DEFAULT_PIPER_MODEL_NAME,
          sizeBytes: 0,
          downloadProgress: 15,
          cacheVersion: PIPER_CACHE_VERSION,
          isOfflineReady: false
        });
        const modelUrl = `${MODEL_BASE_URL}/${ONNX_FILENAME}`;
        let modelRes;
        try {
          modelRes = await fetch(modelUrl);
        } catch (netErr) {
          const err = new Error(`download failed: network error fetching weights from ${modelUrl} (${netErr?.message})`);
          err.category = "DOWNLOAD_FAILED";
          throw err;
        }
        if (!modelRes.ok) {
          const err = new Error(`download failed: HTTP ${modelRes.status} fetching weights from ${modelUrl}`);
          err.category = "DOWNLOAD_FAILED";
          throw err;
        }
        const contentLength = Number(modelRes.headers.get("content-length")) || 25 * 1024 * 1024;
        const reader = modelRes.body?.getReader();
        let onnxBytes;
        if (!reader) {
          onnxBytes = await modelRes.arrayBuffer();
          this.currentProgress = 90;
          onProgress?.(90);
        } else {
          const chunks = [];
          let receivedBytes = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              receivedBytes += value.length;
              const pct = Math.min(90, Math.floor(15 + receivedBytes / contentLength * 75));
              this.currentProgress = pct;
              onProgress?.(pct);
              this.notify({
                status: "downloading",
                modelName: DEFAULT_PIPER_MODEL_NAME,
                sizeBytes: receivedBytes,
                downloadProgress: pct,
                cacheVersion: PIPER_CACHE_VERSION,
                isOfflineReady: false
              });
            }
          }
          const merged = new Uint8Array(receivedBytes);
          let offset = 0;
          for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.length;
          }
          onnxBytes = merged.buffer;
        }
        const bytesValidation = validatePiperModelBytes(onnxBytes);
        if (!bytesValidation.valid) {
          const err = new Error(`parse failed: ${bytesValidation.error}`);
          err.category = "PARSE_FAILED";
          throw err;
        }
        this.currentProgress = 95;
        onProgress?.(95);
        const saved = await this.saveModel(DEFAULT_PIPER_MODEL_NAME, onnxBytes, configJsonStr);
        if (!saved) {
          const err = new Error("storage failed: could not persist model and configuration in IndexedDB");
          err.category = "STORAGE_FAILED";
          throw err;
        }
        this.currentStatus = "ready";
        this.currentProgress = 100;
        this.errorMessage = void 0;
        this.errorCategory = void 0;
        onProgress?.(100);
        return true;
      } catch (err) {
        console.error("Piper model download error:", err);
        this.currentStatus = "error";
        this.errorCategory = err?.category || (err?.message?.includes("download") ? "DOWNLOAD_FAILED" : "PARSE_FAILED");
        this.errorMessage = err?.message || "Download failed";
        this.notify({
          status: "error",
          modelName: DEFAULT_PIPER_MODEL_NAME,
          sizeBytes: 0,
          downloadProgress: 0,
          errorMessage: this.errorMessage,
          errorCategory: this.errorCategory,
          cacheVersion: PIPER_CACHE_VERSION,
          isOfflineReady: false
        });
        return false;
      }
    }
    /**
     * Delete cached model from IndexedDB
     */
    async clearCache(modelId = DEFAULT_PIPER_MODEL_NAME) {
      try {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(modelId);
          req.onsuccess = () => {
            this.currentStatus = "not_cached";
            this.currentProgress = 0;
            this.notify({
              status: "not_cached",
              modelName: modelId,
              sizeBytes: 0,
              downloadProgress: 0,
              isOfflineReady: false
            });
            resolve();
          };
          req.onerror = () => reject(req.error);
        });
      } catch (err) {
        console.warn("Could not clear IndexedDB model cache:", err);
      }
    }
  };
  var indexedDbModelStore = new IndexedDbModelStore();

  // src/services/tts/farsiPhonemizer.ts
  var normalizeFarsiText = normalizePersianText;
  async function farsiTextToPiperTokens(text, phonemeIdMap) {
    return farsiPhonemizer.phonemizeToTokens(text, phonemeIdMap);
  }

  // src/services/tts/piperEngine.ts
  var cachedOrtModule = null;
  var ortLoadPromise = null;
  async function getOrt() {
    if (typeof globalThis.ort !== "undefined" && globalThis.ort?.InferenceSession) {
      cachedOrtModule = globalThis.ort;
      return cachedOrtModule;
    }
    if (cachedOrtModule) return cachedOrtModule;
    if (ortLoadPromise) return ortLoadPromise;
    ortLoadPromise = (async () => {
      try {
        const ort = await import("onnxruntime-web");
        if (ort?.env?.wasm) {
          if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
            ort.env.wasm.wasmPaths = chrome.runtime.getURL("");
          } else {
            ort.env.wasm.wasmPaths = "/";
          }
          ort.env.wasm.numThreads = Math.min(2, Math.max(1, (typeof navigator !== "undefined" ? navigator.hardwareConcurrency : 2) || 2) - 1);
          ort.env.wasm.simd = true;
        }
        cachedOrtModule = ort;
        return ort;
      } catch (err) {
        console.warn("Could not dynamically load onnxruntime-web, will use eSpeak fallback:", err);
        return null;
      } finally {
        ortLoadPromise = null;
      }
    })();
    return ortLoadPromise;
  }
  var PiperEngine = class {
    constructor() {
      this.name = "Piper Neural (ONNX Web)";
      this.engineType = "piper";
      this.session = null;
      this.modelConfig = null;
      this.isInitializing = false;
      this.lastInitError = null;
      this.isCurrentlySpeaking = false;
      this.sampleRate = 22050;
      this.currentPlaybackHandle = null;
    }
    /**
     * Inject mock session and config for testing and regression suites
     */
    setSessionForTesting(mockSession, mockConfig) {
      this.session = mockSession;
      if (mockConfig) {
        this.modelConfig = mockConfig;
        if (mockConfig.audio?.sample_rate) {
          this.sampleRate = mockConfig.audio.sample_rate;
        }
      }
    }
    /**
     * Standard initialize method
     */
    async initialize() {
      await this.init();
    }
    /**
     * Initializes the ONNX session using model cached in IndexedDB
     */
    async init() {
      if (this.session) return true;
      if (this.isInitializing) return false;
      this.isInitializing = true;
      this.lastInitError = null;
      try {
        const cached = await indexedDbModelStore.getModel(DEFAULT_PIPER_MODEL_NAME);
        if (!cached || !cached.onnxBytes || cached.onnxBytes.byteLength < 5e3) {
          this.isInitializing = false;
          this.lastInitError = {
            message: "Piper neural model not cached in IndexedDB",
            category: "STORAGE_FAILED"
          };
          return false;
        }
        const validation = validatePiperModelConfig(cached.config, DEFAULT_PIPER_MODEL_NAME);
        if (!validation.valid || !validation.config) {
          console.error("Piper model initialization failed: invalid config in IndexedDB:", validation.error);
          this.isInitializing = false;
          this.lastInitError = {
            message: `parse failed: ${validation.error || "invalid config in IndexedDB"}`,
            category: "PARSE_FAILED"
          };
          return false;
        }
        this.modelConfig = validation.config;
        if (this.modelConfig?.audio?.sample_rate) {
          this.sampleRate = this.modelConfig.audio.sample_rate;
        }
        const ort = await getOrt();
        if (!ort || !ort.InferenceSession) {
          console.warn("ONNX Runtime unavailable in environment");
          this.isInitializing = false;
          this.lastInitError = {
            message: "model initialization failed: ONNX Runtime Web unavailable in environment",
            category: "INIT_FAILED"
          };
          return false;
        }
        const sessionOptions = {
          executionProviders: ["wasm", "cpu"],
          graphOptimizationLevel: "all"
        };
        this.session = await ort.InferenceSession.create(cached.onnxBytes, sessionOptions);
        this.isInitializing = false;
        console.log("\u2713 Piper Farsi ONNX Inference Session initialized (100% offline)");
        return true;
      } catch (err) {
        console.warn("Could not initialize Piper ONNX session, fallback available:", err);
        this.session = null;
        this.isInitializing = false;
        this.lastInitError = {
          message: `model initialization failed: ${err?.message || "ONNX session creation error"}`,
          category: "INIT_FAILED"
        };
        return false;
      }
    }
    isModelReady() {
      return this.session !== null;
    }
    /**
     * Direct Piper ONNX synthesis without fallback invocation.
     * Returns explicit success: true with Piper wavBlob or success: false with error.
     */
    async synthesizeDirect(text, options = {}) {
      const isReady = await this.init();
      if (!isReady || !this.session) {
        return {
          success: false,
          engineUsed: "piper",
          error: this.lastInitError?.message || "ONNX Runtime unavailable or Piper neural model not cached in IndexedDB",
          errorCategory: this.lastInitError?.category || "INIT_FAILED"
        };
      }
      try {
        const normalized = normalizeFarsiText(text);
        if (!normalized) {
          const emptySamples = new Float32Array(0);
          return {
            success: true,
            engineUsed: "piper",
            wavBlob: encodePcmWav(emptySamples, this.sampleRate),
            durationMs: 0,
            sampleRate: this.sampleRate
          };
        }
        const ort = await getOrt();
        if (!ort) {
          return {
            success: false,
            engineUsed: "piper",
            error: "ONNX Runtime unavailable"
          };
        }
        const speed = Math.max(0.5, Math.min(2, options.speed ?? 1));
        const phonemeMap = this.modelConfig?.phoneme_id_map || void 0;
        const tokens = await farsiTextToPiperTokens(normalized, phonemeMap);
        if (!tokens || tokens.length <= 2) {
          throw new Error("Tokenization resulted in empty token sequence");
        }
        const tokenArray = BigInt64Array.from(tokens.map((t) => BigInt(t)));
        const inputTensor = new ort.Tensor("int64", tokenArray, [1, tokens.length]);
        const inputLengthsTensor = new ort.Tensor("int64", BigInt64Array.from([BigInt(tokens.length)]), [1]);
        const noiseScale = this.modelConfig?.inference?.noise_scale ?? 0.667;
        const lengthScale = (this.modelConfig?.inference?.length_scale ?? 1) / speed;
        const noiseW = this.modelConfig?.inference?.noise_w ?? 0.8;
        const scalesTensor = new ort.Tensor("float32", new Float32Array([noiseScale, lengthScale, noiseW]), [3]);
        const feeds = {
          input: inputTensor,
          input_lengths: inputLengthsTensor,
          scales: scalesTensor
        };
        if (this.session.inputNames && this.session.inputNames.includes("sid")) {
          feeds["sid"] = new ort.Tensor("int64", BigInt64Array.from([BigInt(0)]), [1]);
        }
        const results = await this.session.run(feeds);
        const outputTensor = this.session.outputNames && results[this.session.outputNames[0]] || results.output;
        if (!outputTensor) {
          return {
            success: false,
            engineUsed: "piper",
            error: "Piper inference returned empty audio output tensor"
          };
        }
        const rawFloatData = extractPiperAudioSamples(outputTensor);
        const wavBlob = encodePcmWav(rawFloatData, this.sampleRate);
        const durationMs = Math.round(rawFloatData.length / this.sampleRate * 1e3);
        return {
          success: true,
          engineUsed: "piper",
          wavBlob,
          durationMs,
          sampleRate: this.sampleRate
        };
      } catch (inferenceErr) {
        console.warn("Piper inference error:", inferenceErr);
        return {
          success: false,
          engineUsed: "piper",
          error: `inference failed: ${inferenceErr?.message || "Piper inference error"}`,
          errorCategory: "INFERENCE_FAILED"
        };
      }
    }
    /**
     * Synthesize Farsi text into audio.
     * PiperEngine ONLY synthesizes via Piper neural model.
     * If Piper succeeds, returns honest Piper WAV audio.
     * If Piper is unavailable or fails, returns success: false with error details.
     * It NEVER secretly invokes eSpeak fallback — the FarsiOfflineTtsManager is in charge of fallback!
     */
    async synthesize(text, options = {}) {
      const directRes = await this.synthesizeDirect(text, options);
      if (directRes.success && directRes.wavBlob) {
        return {
          success: true,
          wavBlob: directRes.wavBlob,
          durationMs: directRes.durationMs ?? 0,
          sampleRate: directRes.sampleRate ?? this.sampleRate,
          engineUsed: "piper",
          fallbackTriggered: false
        };
      }
      return {
        success: false,
        wavBlob: encodePcmWav(new Float32Array(0), this.sampleRate),
        durationMs: 0,
        sampleRate: this.sampleRate,
        engineUsed: "piper",
        fallbackTriggered: false,
        error: directRes.error || "Piper neural synthesis unavailable or model not cached",
        errorCategory: directRes.errorCategory
      };
    }
    /**
     * Play speech with clean interruption
     */
    async speak(text, options = {}) {
      this.stop();
      this.isCurrentlySpeaking = true;
      try {
        const result = await this.synthesize(text, options);
        if (!result.success || !result.wavBlob) {
          this.isCurrentlySpeaking = false;
          options.onError?.(new Error(result.error || "Piper audio synthesis produced no audio data"));
          return;
        }
        await this.playWavBlob(result.wavBlob, options);
      } catch (err) {
        this.isCurrentlySpeaking = false;
        this.currentPlaybackHandle = null;
        options.onError?.(err);
        throw err;
      }
    }
    /**
     * Helper to play an already-synthesized WAV blob
     */
    async playWavBlob(blob, options = {}) {
      this.stop();
      this.isCurrentlySpeaking = true;
      this.currentPlaybackHandle = await playAudioBlob(blob, {
        volume: options.volume ?? 1,
        onStart: () => {
          options.onStart?.();
        },
        onEnd: () => {
          this.isCurrentlySpeaking = false;
          this.currentPlaybackHandle = null;
          options.onEnd?.();
        },
        onError: (err) => {
          this.isCurrentlySpeaking = false;
          this.currentPlaybackHandle = null;
          options.onError?.(err);
        }
      });
    }
    stop() {
      if (this.currentPlaybackHandle) {
        try {
          this.currentPlaybackHandle.stop();
        } catch {
        }
        this.currentPlaybackHandle = null;
      }
      this.isCurrentlySpeaking = false;
    }
    dispose() {
      this.stop();
      if (this.session && typeof this.session.release === "function") {
        try {
          this.session.release();
        } catch {
        }
      }
      this.session = null;
    }
    isSpeaking() {
      return this.isCurrentlySpeaking;
    }
  };
  var piperEngine = new PiperEngine();

  // src/utils/performanceDiagnostics.ts
  var import_meta5 = {};
  var isDev = Boolean(
    typeof import_meta5 !== "undefined" && import_meta5.env?.DEV || typeof process !== "undefined" && true
  );
  function logDevDiagnostic(label, details) {
    if (!isDev) return;
    console.info(`[Diagnostic: ${label}]`, details);
  }

  // src/utils/safeStorage.ts
  var SAFE_MAX_STORAGE_ITEM_BYTES = 2 * 1024 * 1024;
  var memoryFallback = {};
  var fallbackKeys = /* @__PURE__ */ new Set();
  var storageDiagnostics = {
    quotaExceededCount: 0,
    lastErrorKey: null,
    lastErrorMessage: null,
    lastErrorTimestamp: null,
    inMemoryKeys: []
  };
  function isLocalStorageAvailable() {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return false;
      }
      const testKey = "__adhd_storage_test__";
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
  var hasLocalStorage = isLocalStorageAvailable();
  var safeStorage = {
    getItem(key) {
      if (fallbackKeys.has(key)) {
        return memoryFallback[key] ?? null;
      }
      try {
        if (hasLocalStorage) {
          const value = window.localStorage.getItem(key);
          if (value !== null) {
            return value;
          }
        }
      } catch (e) {
        console.warn(`[SafeStorage] Read failed for key "${key}", falling back to memory:`, e);
      }
      return memoryFallback[key] ?? null;
    },
    setItem(key, value) {
      const sizeBytes = value.length * 2;
      if (sizeBytes > SAFE_MAX_STORAGE_ITEM_BYTES) {
        memoryFallback[key] = value;
        fallbackKeys.add(key);
        storageDiagnostics.inMemoryKeys = Array.from(fallbackKeys);
        logDevDiagnostic("Storage Diverted to Memory (Payload Size)", {
          key,
          sizeKb: Math.round(sizeBytes / 1024),
          reason: "Exceeds SAFE_MAX_STORAGE_ITEM_BYTES threshold"
        });
        return;
      }
      try {
        if (hasLocalStorage) {
          window.localStorage.setItem(key, value);
          fallbackKeys.delete(key);
          delete memoryFallback[key];
          storageDiagnostics.inMemoryKeys = Array.from(fallbackKeys);
          return;
        }
      } catch (e) {
        const isQuotaError = e?.name === "QuotaExceededError" || e?.name === "NS_ERROR_DOM_QUOTA_REACHED" || e?.code === 22 || e?.code === 1014;
        if (isQuotaError) {
          storageDiagnostics.quotaExceededCount++;
        }
        storageDiagnostics.lastErrorKey = key;
        storageDiagnostics.lastErrorMessage = e?.message || String(e);
        storageDiagnostics.lastErrorTimestamp = Date.now();
        console.warn(
          `[SafeStorage] LocalStorage write failed for key "${key}" (${Math.round(sizeBytes / 1024)} KB). Retaining safely in memory:`,
          e
        );
      }
      memoryFallback[key] = value;
      fallbackKeys.add(key);
      storageDiagnostics.inMemoryKeys = Array.from(fallbackKeys);
    },
    removeItem(key) {
      fallbackKeys.delete(key);
      delete memoryFallback[key];
      storageDiagnostics.inMemoryKeys = Array.from(fallbackKeys);
      try {
        if (hasLocalStorage) {
          window.localStorage.removeItem(key);
        }
      } catch {
      }
    },
    clearAll() {
      fallbackKeys.clear();
      for (const k of Object.keys(memoryFallback)) {
        delete memoryFallback[k];
      }
      storageDiagnostics.inMemoryKeys = [];
      try {
        if (hasLocalStorage) {
          window.localStorage.clear();
        }
      } catch {
      }
    },
    getDiagnostics() {
      return { ...storageDiagnostics };
    },
    isFallbackKey(key) {
      return fallbackKeys.has(key);
    }
  };

  // src/services/tts/farsiOfflineTTS.ts
  var STORAGE_KEY_ENGINE = "adhd_reader_farsi_tts_engine";
  var SAMPLE_FARSI_TEXT = "\u0627\u06CC\u0646 \u06CC\u06A9 \u0622\u0632\u0645\u0627\u06CC\u0634 \u0628\u0631\u0627\u06CC \u0633\u06CC\u0633\u062A\u0645 \u062A\u0628\u062F\u06CC\u0644 \u0645\u062A\u0646 \u0628\u0647 \u06AF\u0641\u062A\u0627\u0631 \u0622\u0641\u0644\u0627\u06CC\u0646 \u0641\u0627\u0631\u0633\u06CC \u0627\u0633\u062A.";
  var FarsiOfflineTtsManager = class {
    constructor() {
      this.activeEngine = "espeak";
      this.currentPlayingId = 0;
      this.isSpeakingActive = false;
      this.activeCallbacks = null;
      this.listeners = /* @__PURE__ */ new Set();
      this.loadSavedSettings();
      this.setupExtensionMessageListener();
    }
    setupExtensionMessageListener() {
      if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
        try {
          chrome.runtime.onMessage.addListener((message) => {
            const action = message.action || message.type;
            if (action === "STATUS_CHANGED") {
              this.handleExtensionStatusChanged(message);
            }
          });
        } catch {
        }
      }
    }
    /**
     * Dispatches lifecycle transitions from offscreen audio document
     */
    handleExtensionStatusChanged(msg) {
      const { state, playbackId, error } = msg;
      if (playbackId !== void 0 && playbackId !== this.currentPlayingId) {
        return;
      }
      if (state === "STARTED" || state === "PLAYING") {
        this.isSpeakingActive = true;
        this.activeCallbacks?.onStart?.();
        this.notify();
      } else if (state === "ENDED") {
        this.isSpeakingActive = false;
        const cb = this.activeCallbacks;
        this.activeCallbacks = null;
        cb?.onEnd?.();
        this.notify();
      } else if (state === "STOPPED") {
        this.isSpeakingActive = false;
        this.activeCallbacks = null;
        this.notify();
      } else if (state === "ERROR") {
        this.isSpeakingActive = false;
        const cb = this.activeCallbacks;
        this.activeCallbacks = null;
        cb?.onError?.(new Error(error || "Extension audio playback failed"));
        this.notify();
      }
    }
    loadSavedSettings() {
      if (typeof window === "undefined") return;
      try {
        const savedEngine = safeStorage.getItem(STORAGE_KEY_ENGINE);
        if (savedEngine === "espeak" || savedEngine === "piper") {
          this.activeEngine = savedEngine;
        }
        if (typeof chrome !== "undefined" && chrome.storage?.local) {
          chrome.storage.local.get(["farsiTtsEngine"], (res) => {
            if (res?.farsiTtsEngine === "espeak" || res?.farsiTtsEngine === "piper") {
              this.activeEngine = res.farsiTtsEngine;
              this.notify();
            }
          });
        }
      } catch {
      }
    }
    subscribe(cb) {
      this.listeners.add(cb);
      return () => this.listeners.delete(cb);
    }
    notify() {
      this.listeners.forEach((cb) => cb());
    }
    getActiveEngine() {
      return this.activeEngine;
    }
    setEngine(engine) {
      this.activeEngine = engine;
      safeStorage.setItem(STORAGE_KEY_ENGINE, engine);
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        chrome.storage.local.set({ farsiTtsEngine: engine }).catch(() => {
        });
      }
      this.sendExtensionMessage({ action: "SET_ENGINE", engine });
      this.notify();
    }
    /**
     * Helper to check if running inside a Manifest V3 Chrome Extension context
     */
    isExtensionContext() {
      return typeof chrome !== "undefined" && !!chrome.runtime && !!chrome.runtime.id && typeof chrome.runtime.sendMessage === "function";
    }
    sendExtensionMessage(payload) {
      if (!this.isExtensionContext()) {
        return Promise.resolve({ success: false, reason: "not_extension" });
      }
      return new Promise((resolve) => {
        try {
          chrome.runtime.sendMessage(payload, (response) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
              resolve(response || { success: true });
            }
          });
        } catch (e) {
          resolve({ success: false, error: e?.message });
        }
      });
    }
    /**
     * Synthesize text into audio buffer / WAV Blob.
     * Fallback is explicit and managed by FarsiOfflineTtsManager (neither engine secretly invokes the other).
     */
    async synthesize(text, options = {}) {
      const engineType = options.engine || this.activeEngine;
      if (engineType === "piper") {
        const piperResult = await piperEngine.synthesize(text, options);
        if (piperResult.success) {
          return piperResult;
        }
        if (options.allowFallback === false) {
          return piperResult;
        }
        const reason = piperResult.error || "Piper neural model not ready in IndexedDB";
        console.warn(`[FarsiOfflineTtsManager] Piper failed (${reason}). Explicitly falling back to eSpeak NG WASM.`);
        options.onFallback?.(reason);
        const fallbackResult = await espeakEngine.synthesize(text, options);
        return {
          ...fallbackResult,
          engineUsed: "espeak",
          fallbackTriggered: true,
          fallbackReason: reason
        };
      } else {
        return espeakEngine.synthesize(text, options);
      }
    }
    /**
     * Play speech.
     * Cancels any active audio immediately before starting the new utterance.
     */
    async speak(text, options = {}) {
      this.stop();
      const playbackId = ++this.currentPlayingId;
      this.isSpeakingActive = true;
      this.activeCallbacks = options;
      this.notify();
      const engineType = options.engine || this.activeEngine;
      if (this.isExtensionContext()) {
        try {
          const res = await this.sendExtensionMessage({
            action: "SPEAK",
            type: "SPEAK",
            text,
            engine: engineType,
            speed: options.speed ?? 1,
            pitch: options.pitch ?? 1,
            volume: options.volume ?? 1,
            allowFallback: options.allowFallback ?? true,
            playbackId
          });
          if (res && res.success) {
            if (res.fallbackTriggered && res.fallbackReason) {
              options.onFallback?.(res.fallbackReason);
            }
            options.onStart?.();
            return;
          } else if (res && !res.success) {
            this.isSpeakingActive = false;
            this.activeCallbacks = null;
            this.notify();
            options.onError?.(new Error(res.error || "Extension offscreen speech synthesis failed"));
            return;
          }
        } catch (extErr) {
          console.debug("Extension offscreen message failed, falling back to local synthesizer:", extErr);
        }
      }
      const wrappedOptions = {
        ...options,
        onStart: () => {
          if (this.currentPlayingId === playbackId) {
            options.onStart?.();
          }
        },
        onEnd: () => {
          if (this.currentPlayingId === playbackId) {
            this.isSpeakingActive = false;
            this.activeCallbacks = null;
            this.notify();
            options.onEnd?.();
          }
        },
        onError: (err) => {
          if (this.currentPlayingId === playbackId) {
            this.isSpeakingActive = false;
            this.activeCallbacks = null;
            this.notify();
            options.onError?.(err);
          }
        },
        onFallback: (reason) => {
          options.onFallback?.(reason);
        }
      };
      const synthResult = await this.synthesize(text, options);
      if (!synthResult.success || !synthResult.wavBlob) {
        this.isSpeakingActive = false;
        this.activeCallbacks = null;
        this.notify();
        options.onError?.(new Error(synthResult.error || "Speech synthesis failed"));
        return;
      }
      if (synthResult.fallbackTriggered && synthResult.fallbackReason) {
        options.onFallback?.(synthResult.fallbackReason);
      }
      const activeEngineInstance = synthResult.engineUsed === "piper" ? piperEngine : espeakEngine;
      await activeEngineInstance.playWavBlob(synthResult.wavBlob, wrappedOptions);
    }
    /**
     * Immediately stops any active audio playback
     */
    stop() {
      this.currentPlayingId++;
      this.isSpeakingActive = false;
      this.activeCallbacks = null;
      espeakEngine.stop();
      piperEngine.stop();
      if (this.isExtensionContext()) {
        this.sendExtensionMessage({
          action: "STOP",
          type: "STOP",
          playbackId: this.currentPlayingId
        }).catch(() => {
        });
      }
      this.notify();
    }
    /**
     * Standard status query matching canonical extension contract (GET_STATUS)
     */
    async getStatus() {
      if (this.isExtensionContext()) {
        try {
          const res = await this.sendExtensionMessage({ action: "GET_STATUS", type: "GET_STATUS" });
          if (res?.success && res.status) {
            return {
              isSpeaking: res.status.isSpeaking ?? this.isSpeakingActive,
              activeEngine: res.status.activeEngine || this.activeEngine
            };
          }
        } catch {
        }
      }
      return {
        isSpeaking: this.isSpeaking(),
        activeEngine: this.activeEngine
      };
    }
    isSpeaking() {
      return this.isSpeakingActive || espeakEngine.isSpeaking() || piperEngine.isSpeaking();
    }
    /**
     * IndexedDB Model Management for Piper Neural
     */
    async getPiperCacheInfo() {
      return indexedDbModelStore.checkCache();
    }
    subscribePiperCache(cb) {
      return indexedDbModelStore.subscribe(cb);
    }
    async downloadPiperModel(onProgress) {
      const success = await indexedDbModelStore.downloadAndCacheModel(onProgress);
      if (success) {
        await piperEngine.init();
        this.notify();
      }
      return success;
    }
    async clearPiperCache() {
      await indexedDbModelStore.clearCache();
      this.notify();
    }
    /**
     * Quick preview test
     */
    async preview(engine = this.activeEngine, speed = 1, pitch = 1, volume = 1, onFallback) {
      return this.speak(SAMPLE_FARSI_TEXT, {
        engine,
        speed,
        pitch,
        volume,
        onFallback
      });
    }
  };
  var farsiOfflineTts = new FarsiOfflineTtsManager();

  // src/services/tts/offscreenBridge.ts
  if (typeof globalThis !== "undefined") {
    const g = globalThis;
    g.farsiOfflineTts = farsiOfflineTts;
    g.piperEngine = piperEngine;
    g.espeakEngine = espeakEngine;
    g.PiperEngine = PiperEngine;
    g.EspeakEngine = EspeakEngine;
    g.farsiPhonemizer = farsiPhonemizer;
    g.encodePcmWav = encodePcmWav;
    g.encodePcmWavBuffer = encodePcmWavBuffer;
    g.validateWavBuffer = validateWavBuffer;
    g.playAudioBlob = playAudioBlob;
    g.normalizePersianText = normalizePersianText;
    g.phonemesToPiperTokens = phonemesToPiperTokens;
    g.indexedDbModelStore = indexedDbModelStore;
    g.PIPER_CACHE_VERSION = PIPER_CACHE_VERSION;
  }
  return __toCommonJS(offscreenBridge_exports);
})();
