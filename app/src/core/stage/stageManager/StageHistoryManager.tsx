import { Project, ProjectState, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { deserialize, serialize } from "@graphif/serializer";
import { Delta, diff, patch } from "jsondiffpatch";
import _ from "lodash";
import { toast } from "sonner";

/**
 * 专门管理历史记录
 * 负责撤销、反撤销、重做等操作
 * 具有直接更改舞台状态的能力
 *
 * 切换文件，保存时都应该重置
 */
@service("historyManager")
export class HistoryManager {
  /**
   * 历史记录列表数组
   */
  deltas: Delta[] = [];
  /**
   * 历史记录列表数组上的一个指针
   */
  currentIndex = -1;
  initialStage: Record<string, any>[] = [];

  // 在软件启动时调用
  constructor(private readonly project: Project) {
    this.initialStage = serialize(project.stage);
  }

  /**
   * 记录一步骤
   * @param file
   */
  recordStep() {
    this.deltas.splice(this.currentIndex + 1);
    // 上面一行的含义：删除从 currentIndex + 1 开始的所有元素。
    // 也就是撤回了好几步之后再做修改，后面的曾经历史就都删掉了，相当于重开了一个分支。
    this.currentIndex++;
    const prev = serialize(this.get(this.currentIndex - 1));
    const current = serialize(this.project.stage);
    const patch_ = diff(prev, current);
    if (!patch_) return;
    this.deltas.push(patch_);
    if (this.deltas.length > Settings.historySize) {
      // 当历史记录超过限制时，需要删除最旧的记录
      // 但是不能简单删除，因为get方法依赖于从initialStage开始应用所有delta
      // 所以我们需要将第一个delta合并到initialStage中，然后删除这个delta
      const firstDelta = _.cloneDeep(this.deltas[0]);
      this.initialStage = patch(_.cloneDeep(this.initialStage), firstDelta) as any;
      this.currentIndex--;
    }
    // 检测index是否越界
    if (this.currentIndex >= this.deltas.length) {
      this.currentIndex = this.deltas.length - 1;
    }
    this.project.state = ProjectState.Unsaved;
  }

  /**
   * 撤销
   */
  undo() {
    if (this.currentIndex >= 0) {
      this.currentIndex--;
      this.project.stage = this.get(this.currentIndex);
      toast(`当前进度：${this.currentIndex + 1} / ${this.deltas.length}`);
    } else {
      toast(`已到撤回到底！${this.currentIndex + 1} / ${this.deltas.length}，默认 ctrl + y 反撤销`);
    }
  }

  /**
   * 反撤销
   */
  redo() {
    if (this.currentIndex < this.deltas.length - 1) {
      this.currentIndex++;
      this.project.stage = this.get(this.currentIndex);
      toast(`当前进度：${this.currentIndex + 1} / ${this.deltas.length}`);
    } else {
      toast(`已到最新状态！${this.currentIndex + 1} / ${this.deltas.length}`);
    }
  }

  get(index: number) {
    // 处理边界情况：如果索引为负数，直接返回初始状态
    if (index < 0) {
      return deserialize(_.cloneDeep(this.initialStage), this.project);
    }

    // 先获取从0到index（包含index）的所有patch
    const deltas = _.cloneDeep(this.deltas.slice(0, index + 1));
    // 从initialStage开始应用patch，得到在index时刻的舞台序列化数据
    // const data = deltas.reduce((acc, delta) => {
    //   return patch(_.cloneDeep(acc), _.cloneDeep(delta)) as any;
    // }, _.cloneDeep(this.initialStage));
    let data = _.cloneDeep(this.initialStage);
    for (const delta of deltas) {
      data = patch(data, _.cloneDeep(delta)) as any;
    }
    // 反序列化得到舞台对象
    const stage = deserialize(data, this.project);
    return stage;
  }
}
