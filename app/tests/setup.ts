import "@testing-library/jest-dom";
// 伪代码解决方案：修复测试中的 Canvas 和 AudioContext 错误

// 目标：在测试环境中模拟 HTMLCanvasElement.prototype.getContext 和 window.AudioContext，以解决测试错误。

// 步骤 1：处理 HTMLCanvasElement.prototype.getContext 错误

// 模拟 HTMLCanvasElement.prototype.getContext
// 确保在全局环境或测试环境中执行此代码
if (typeof window !== "undefined" && window.HTMLCanvasElement) {
  window.HTMLCanvasElement.prototype.getContext = function (contextType) {
    if (contextType === "2d") {
      return {
        fillRect: () => {},
        strokeRect: () => {},
        measureText: (text) => ({ width: text.length * 6 }), // 简单模拟文本宽度
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fillText: () => {},
        clearRect: () => {},
        // 添加其他需要的模拟方法
        canvas: this, // 模拟 context 的 canvas 属性
        font: "",
        textAlign: "left",
        textBaseline: "alphabetic",
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
        // ... 其他属性和方法
      };
    }
    return null;
  };
}

// 步骤 2：处理 window.AudioContext 错误

// 模拟 window.AudioContext
// 确保在全局环境或测试环境中执行此代码
if (typeof window !== "undefined") {
  window.AudioContext = class MockAudioContext {
    constructor() {
      // 模拟构造函数
    }
    createGain() {
      return {
        connect: () => {},
        disconnect: () => {},
        gain: { value: 1 },
      };
    }
    createBufferSource() {
      return {
        buffer: null,
        connect: () => {},
        start: () => {},
        stop: () => {},
        onended: null,
      };
    }
    decodeAudioData(
      audioData: ArrayBuffer,
      successCallback: (decodedData: AudioBuffer) => void,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _errorCallback?: (error: DOMException) => void,
    ) {
      // 简单模拟解码
      successCallback({
        duration: 0,
        sampleRate: 44100,
        length: 0,
        numberOfChannels: 0,
        getChannelData: () => new Float32Array(0),
        copyFromChannel: () => {},
        copyToChannel: () => {},
      });
    }
    // 添加其他需要的模拟方法
  };
}
