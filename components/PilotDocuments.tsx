export function PilotDocuments({terms, notice}: {terms: string; notice: string}) {
  return <section className="my-4 space-y-3">
    <details><summary className="font-semibold">Read private pilot terms</summary><p className="mt-2 whitespace-pre-line">{terms}</p></details>
    <details><summary className="font-semibold">Read private pilot privacy notice</summary><p className="mt-2 whitespace-pre-line">{notice}</p></details>
  </section>;
}
