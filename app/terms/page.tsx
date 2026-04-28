import { PageHeader } from "@/components/ui";

export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Terms of use" />
      <div className="prose-plain max-w-none text-[15px]">
        <p>
          MarshalHQ provides a platform for connecting UK production managers
          with location marshals. By using the service you agree to the
          following.
        </p>
        <p>
          <strong>Your account.</strong> You must provide accurate information
          at signup. One account per person. You are responsible for actions
          taken under your account.
        </p>
        <p>
          <strong>Shifts and applications.</strong> Managers post shifts that
          represent genuine work. Marshals apply only to shifts they are able
          to complete. A shift moves to <em>Filled</em> when a manager accepts
          one applicant, at which point contact details are released only to
          that pair.
        </p>
        <p>
          <strong>Conduct.</strong> Do not misrepresent yourself, do not share
          contact details through the platform before acceptance, and do not
          use MarshalHQ to circumvent fair hiring.
        </p>
        <p>
          <strong>Liability.</strong> MarshalHQ is a staffing tool. It does not
          employ marshals and is not party to the agreement between a manager
          and a marshal.
        </p>
        <p>
          <strong>Changes.</strong> We may update these terms. Continued use
          after an update constitutes acceptance.
        </p>
      </div>
    </div>
  );
}
