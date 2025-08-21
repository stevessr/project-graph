import { Field } from "@/components/ui/field";
import { Heart } from "lucide-react";
import "./assets/font.css";

export default function CreditsTab() {
  return (
    <div className="mx-auto flex w-2/3 flex-col overflow-auto">
      <Donation user="鳕鱼" note="支持开源支持国产" amount={50} />
      <Donation user="木头" amount={50} />
      <Donation user="Edelweiß" amount={5} />
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
    <Field icon={<Heart />} title={user} description={note}>
      <div className="flex items-center gap-2 *:font-[DINPro_Bold]">
        <span className="text-2xl">{amount}</span>
        <span className="text-xl">{currency}</span>
      </div>
    </Field>
  );
}
