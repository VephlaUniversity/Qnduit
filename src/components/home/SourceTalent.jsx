import { SourceTalentForm } from "./SourceTalentForm";

export const SourceTalent = () => {
  return (
    <div className="min-h-screen  items-center justify-center p-4">
      <div>
        <h2 className="text-4xl lg:text-5xl  text-center mb-12 text-white">
          Do you have an open role?
          <br /> Post now and Hire
        </h2>
        <SourceTalentForm />
      </div>
    </div>
  );
};
