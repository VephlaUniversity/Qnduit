import TalentSelect from "./TalentSelect";

export default function SavedChoiceSelect({ options, previous, placeholder, ...props }) {
  const legacy = typeof previous === "string" && previous !== "" && !options.includes(previous);
  return <TalentSelect {...props}>
    <option value="">{placeholder}</option>
    {legacy && <option value={previous}>{previous}</option>}
    {options.map(value => <option key={value} value={value}>{value}</option>)}
  </TalentSelect>;
}
