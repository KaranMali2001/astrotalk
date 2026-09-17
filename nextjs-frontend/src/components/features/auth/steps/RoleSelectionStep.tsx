import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type Props = {
  onSelectRole: (role: "user" | "professional") => void;
  onBack: () => void;
};

export function RoleSelectionStep({ onSelectRole, onBack }: Props) {
  return (
    <div className="flex flex-col h-full">
      <button onClick={onBack} className="mb-8 flex items-center gap-2 text-black/60 hover:text-black transition-colors w-fit">
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back</span>
      </button>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <h1 className="text-3xl font-bold text-black mb-3">
          Welcome back!
        </h1>
        <p className="text-black/60 mb-8 text-lg">
          It looks like you have two accounts associated with this number. Which one would you like to use?
        </p>

        <div className="space-y-4">
          <Button
            onClick={() => onSelectRole("user")}
            className="w-full h-14 rounded-2xl bg-white border-2 border-black/10 text-black hover:bg-black/5 hover:border-black transition-all flex items-center justify-between px-6 group"
          >
            <span className="font-semibold text-lg">Continue as User</span>
            <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </div>
          </Button>

          <Button
            onClick={() => onSelectRole("professional")}
            className="w-full h-14 rounded-2xl bg-white border-2 border-black/10 text-black hover:bg-black/5 hover:border-black transition-all flex items-center justify-between px-6 group"
          >
            <span className="font-semibold text-lg">Continue as Professional</span>
            <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
