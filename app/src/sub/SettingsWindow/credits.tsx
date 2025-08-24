import { Field } from "@/components/ui/field";
import { Heart } from "lucide-react";
import "./assets/font.css";

/**
 * 鸣谢界面
 * @returns
 */
export default function CreditsTab() {
  // 计算从2025年1月至今的月份数
  const startDate = new Date(2025, 0, 1); // 2025年1月1日
  const currentDate = new Date();
  const monthsDiff =
    (currentDate.getFullYear() - startDate.getFullYear()) * 12 + (currentDate.getMonth() - startDate.getMonth());

  return (
    <div className="mx-auto flex w-2/3 flex-col overflow-auto">
      <div className="mb-6 text-center">
        <p className="text-foreground text-lg">
          此鸣谢名单为自2025年1月至今共{monthsDiff}个月来的支持者，按从现到早排列
        </p>
      </div>
      <Donation user="勇博" note="" amount={5} />
      <Donation user="ShawnSnow" note="感谢PG" amount={40} />
      <Donation user="飞度" note="做的很酷，真的谢谢你们" amount={50} />
      <Donation user="鳕鱼" note="支持开源支持国产，加油" amount={70} />
      <Donation user="木头" amount={100} />
      <Donation user="林檎LOKI" amount={5} />
      <Donation user="Edelweiß" amount={5} />
      <Donation user="Z·z." note="求个ipad版本的" amount={5} />
      <Donation user="" note="太酷了哥们" amount={5} />
      <Donation user="蓝海" note="" amount={10} />
      <Donation user="渡己" note="" amount={5} />
      <Donation user="微角秒" note="希望这个项目越做越好" amount={50} />
      <Donation user="安麒文" note="感谢您的软件，加油" amount={5} />
      <Donation user="" note="SVG" amount={16} />
      <Donation user="💥知识学爆💥" note="你们的软件很好用，给你们点赞" amount={20} />
      <Donation user="点正🌛🌛🌛" note="膜拜一下" amount={10} />
      <Donation user="米虫先生" note="" amount={100} />
      <Donation user="星尘_" note="加油，看好你们" amount={5} />
      <Donation user="可乐mono" note="加油，目前用过最好的导图类软件" amount={5} />
      <Donation user="62.3%" note="Up要加油呀，我换新电脑第一个装的就是你的软件" amount={5} />
      <Donation user="All the luck" note="感谢你的存在让世界更美好，我希望也在努力的做到" amount={30} />
      <Donation user="胡俊海" note="" amount={5} />
      <Donation user="人" note="" amount={20} />
      <Donation user="木棉" note="谢谢up主的软件" amount={20} />
      <Donation user="Distance" note="加油！！！还没用，先捐赠" amount={5} />
      <Donation user="xxx" note="" amount={5} />
      <Donation user="" note="" amount={5} />
      <Donation user="" note="" amount={10} />
      <Donation user="chocolate" note="" amount={20} />
      <Donation user="Think" note="" amount={100} />
      <Donation user="Sullivan" note="为知识付费" amount={5} />
      <Donation user="天涯" note="为知识付费" amount={2.33} />
      <Donation user="" note="66666666" amount={6.66} />
      <Donation user="阿龙" note="好，请继续努力！" amount={20} />
      <Donation user="把验航" note="" amount={5} />
      <Donation user="全沾工程师" note="太棒啦，能力有限，先小小支持一波" amount={20} />
      <Donation user="耀轩之" note="祝你越来越好" amount={5} />
      <Donation user="otto pan" note="求mac缩放优化" amount={50} />
      <Donation user="llll" note="支持" amount={5} />
      <Donation user="透明" note="" amount={8.88} />
      <Donation user="七侠镇的小智" note="" amount={20} />
      <Donation user="" note="" amount={20} />
      <Donation user="ifelse" note="keep dev" amount={20} />
      <Donation user="Ray" note="继续加油[加油]" amount={18} />
      <Donation user="耀辰" note="思维导图太牛了" amount={5} />
      <Donation user="云深不知处" note="帅" amount={5} />
      <Donation user="好的名字" note="pg太好用了，只能说" amount={5} />
      <Donation user="" note="好用" amount={10} />
      <Donation user="解京" note="感谢软件，祝早日多平台通用" amount={50} />
      <Donation user="唐扬睡醒了" note="我会互相嵌套了(开心)" amount={0.01} />
      <Donation user="唐扬睡醒了" note="很好用，请问如何交叉嵌套" amount={6.66} />
      <Donation user="Kelton" note="很棒的软件，感谢开发者！" amount={5} />
      <Donation user="" note="" amount={50} />
      <Donation user="斑驳窖藏" note="" amount={5} />
      <Donation user="灰烬" note="" amount={20} />
      <Donation user="赵长江" note="" amount={50} />
      <Donation user="cityoasis" note="感谢你的付出。这是一个很好的软件。希望能尽快做到美观成熟" amount={5} />
      <Donation user="A许诺溪" note="希望能和obsidian完美协同" amount={20} />
      <Donation user="L.L." note="加油小小心思，不成敬意" amount={20} />
    </div>
  );
}

function Donation({
  user,
  note = "",
  amount,
  currency = "CNY",
}: {
  user: string;
  note?: string;
  amount: number;
  currency?: string;
}) {
  return (
    <Field
      icon={<Heart />}
      title={user.trim() === "" ? "匿名" : user}
      description={note}
      className={user.trim() === "" ? "text-muted-foreground" : ""}
    >
      <div className="flex items-center gap-2 *:font-[DINPro_Bold]">
        <span className="text-2xl">{amount}</span>
        <span className="text-xl">{currency}</span>
      </div>
    </Field>
  );
}
