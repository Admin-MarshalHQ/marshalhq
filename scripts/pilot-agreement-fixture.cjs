// Only for disposable local action tests. Never creates real participant assent.
exports.seedAgreements = async (db, manager, marshals) => {
  const url = new URL(process.env.DATABASE_URL);
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/setru_qa") throw Error("Expected disposable local fixture database");
  process.env.SETRU_PILOT_DISCLOSURES = JSON.stringify({
    businessAddress: "Synthetic business address", contactEmail: "fixture@example.invalid",
    providersAndTransfers: "Synthetic provider arrangements for isolated QA.", retention: "Synthetic fixture disposal after this run.",
  });
  process.env.PILOT_MANAGER_EMAILS = manager.email;
  process.env.PILOT_MARSHAL_EMAILS = marshals.map(u => u.email).join(",");
  const { pilotDocuments } = require("../lib/pilot-documents.ts");
  const docs = pilotDocuments();
  await db.pilotAgreement.createMany({data:[manager,...marshals].map(u => ({userId:u.id,role:u.role,...docs}))});
};
