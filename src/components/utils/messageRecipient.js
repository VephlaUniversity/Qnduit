const models = { talent: "Talent", employer: "Employer" };

export function messageRecipient(params) {
  const id = params.get("recipientId");
  const type = params.get("recipientType");
  if (id === null && type === null) return { status: "none", key: "" };
  if (params.getAll("recipientId").length !== 1 || params.getAll("recipientType").length !== 1
    || !/^[a-f\d]{24}$/i.test(id || "") || !Object.hasOwn(models, type)) {
    return { status: "invalid", key: `invalid:${id}:${type}` };
  }
  return { status: "valid", id: id.toLowerCase(), model: models[type], type, key: `${models[type]}:${id.toLowerCase()}` };
}

export function messageRecipientUrl(id, type = "talent") {
  return `/dashboard/messages?${new URLSearchParams({ recipientId: id, recipientType: type })}`;
}
