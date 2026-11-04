// Apply authorization/search filters before these stages. The caller chooses
// the distinct identity and optional bucket; stored events are never changed.
export function externalActivityCountStages(identity, {
  bucket = null, distinctField = "externalTalents", clicksField = "externalClicks",
} = {}) {
  return [
    { $group: { _id: identity, clicks: { $sum: 1 } } },
    { $group: { _id: bucket, [distinctField]: { $sum: 1 }, [clicksField]: { $sum: "$clicks" } } },
  ];
}
