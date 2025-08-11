/**
 * 独立于系统剪贴板之外的虚拟剪贴板
 * 因为tauri的剪贴板插件用的是arboard
 * 而arboard不能写入自定义mime type的数据
 * 所以复制舞台对象要用虚拟剪贴板
 * 数据阅后即焚
 */
export namespace VirtualClipboard {
  let data: any = null;

  export function copy(newData: any) {
    data = newData;
  }
  export function paste() {
    const dataToReturn = data;
    data = null;
    return dataToReturn;
  }
  export function clear() {
    data = null;
  }
  export function hasData() {
    return data !== null;
  }
}
