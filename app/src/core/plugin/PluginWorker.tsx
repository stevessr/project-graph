import { pluginApis } from "./apis";
import { apiTypes, PluginManifest, WorkerMessage } from "./types";

/**
 * 插件工作线程
 */
export class PluginWorker {
  private blobUrl: string;
  private worker: Worker;
  private allowedMethods: Array<keyof typeof apiTypes>;

  constructor(code: string, manifest: PluginManifest) {
    // 把code转换成blob
    const blob = new Blob([code], { type: "text/javascript" });
    // 创建worker
    this.blobUrl = URL.createObjectURL(blob);
    console.log("开始创建worker");
    this.worker = new Worker(this.blobUrl);
    console.log("worker创建成功");

    this.allowedMethods = manifest.permissions;

    // worker接收到信息，判断是否为API调用
    this.worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const { type, payload } = e.data;

      // 插件调用API
      if (type === "callAPIMethod") {
        const { method, args, reqId } = payload;

        // 校验API方法是否允许
        if (!this.allowedMethods.includes(method)) {
          this.worker.postMessage({
            type: "apiResponse",
            payload: {
              reqId,
              error: `Method "${method}" is not allowed by manifest`,
            },
          });
          return;
        }

        // 校验API方法参数是否合法
        const argsSchema = apiTypes[method][0];
        if (!args) {
          this.worker.postMessage({
            type: "apiResponse",
            payload: {
              reqId,
              error: `方法 method "${method}" 调用时，未声明参数列表，若该函数不需要参数，请传入空数组 args: []`,
            },
          });
          return;
        }
        for (const [i, arg] of args.entries()) {
          const parseResult = argsSchema[i].safeParse(arg);
          if (!parseResult.success) {
            this.worker.postMessage({
              type: "apiResponse",
              payload: {
                reqId,
                error: `Argument ${i} of method "${method}" is not valid: ${parseResult.error.message}`,
              },
            });
            return;
          }
        }
        // 校验通过

        // 调用API方法
        const apiMethod = pluginApis[method] as (...args: any[]) => any;
        try {
          const result = apiMethod(...args);
          if (result instanceof Promise) {
            result
              .then((res) => {
                this.worker.postMessage({
                  type: "apiResponse",
                  payload: {
                    reqId,
                    success: true,
                    result: res,
                  },
                });
              })
              .catch((err) => {
                this.worker.postMessage({
                  type: "apiResponse",
                  payload: {
                    reqId,
                    success: false,
                    result: err,
                  },
                });
              });
          } else {
            this.worker.postMessage({
              type: "apiResponse",
              payload: {
                reqId,
                success: true,
                result,
              },
            });
          }
        } catch (err) {
          this.worker.postMessage({
            type: "apiResponse",
            payload: {
              reqId,
              success: false,
              result: err,
            },
          });
        }
      }
    };
  }

  destroy() {
    this.worker.terminate();
    URL.revokeObjectURL(this.blobUrl);
  }
}
