import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Alert, Card, DL, PageHeader } from "@/components/ui";
import ConfirmButton from "@/components/ConfirmButton";
import { setSupportRequestResolvedAction } from "@/app/actions/founder";
import { SUPPORT_CATEGORY_LABEL, type SupportCategory } from "@/lib/types";
import SupportNoteForm from "./SupportNoteForm";

export default async function FounderSupportDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const request = await prisma.supportRequest.findUnique({
    where: { id: params.id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          marshalProfile: { select: { id: true, fullName: true } },
          managerProfile: { select: { id: true, companyName: true } },
        },
      },
    },
  });
  if (!request) notFound();

  const resolve = async () => {
    "use server";
    await setSupportRequestResolvedAction(request.id, true);
  };
  const reopen = async () => {
    "use server";
    await setSupportRequestResolvedAction(request.id, false);
  };

  const categoryLabel =
    SUPPORT_CATEGORY_LABEL[request.category as SupportCategory] ??
    request.category;

  return (
    <div>
      <PageHeader
        title={categoryLabel}
        subtitle={`Received ${request.createdAt.toLocaleString("en-GB")}`}
      />
      <div className="mb-4">
        <Link
          href="/founder/support"
          className="text-sm text-accent underline-offset-2 hover:underline"
        >
          ← Back to support
        </Link>
      </div>

      {request.category === "PRIVACY_DELETION" && (
        <Alert tone="warn">
          Deletion requests are handled manually. Do not hard-delete records
          that would break shift, application, completion, or trust history.
        </Alert>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">
            Request
          </p>
          <DL
            items={[
              { label: "From", value: request.email },
              {
                label: "Name",
                value: request.name ?? "\u2014",
              },
              {
                label: "User account",
                value: request.user
                  ? request.user.role === "MARSHAL" &&
                    request.user.marshalProfile
                    ? (
                        <Link
                          href={`/founder/profiles/${request.user.marshalProfile.id}`}
                          className="text-accent underline-offset-2 hover:underline"
                        >
                          {request.user.marshalProfile.fullName ??
                            request.user.email}
                        </Link>
                      )
                    : request.user.role === "MANAGER" &&
                        request.user.managerProfile
                      ? (
                          <Link
                            href={`/founder/users/${request.user.managerProfile.id}`}
                            className="text-accent underline-offset-2 hover:underline"
                          >
                            {request.user.managerProfile.companyName ??
                              request.user.email}
                          </Link>
                        )
                      : request.user.email
                  : "Logged-out submitter",
              },
              { label: "Category", value: categoryLabel },
              {
                label: "Status",
                value: request.resolvedAt
                  ? `Handled ${request.resolvedAt.toLocaleString("en-GB")}`
                  : "Open",
              },
            ]}
          />
          <div className="mt-4">
            <p className="mb-1 text-xs uppercase tracking-wide text-ink-soft">
              Message
            </p>
            <p className="whitespace-pre-wrap text-sm text-ink">
              {request.message}
            </p>
          </div>
        </Card>

        <div className="space-y-3">
          <Card>
            <p className="mb-2 text-sm font-semibold">Triage</p>
            <p className="text-xs text-ink-soft">
              Marking as handled only updates the internal flag. It does not
              email the requester.
            </p>
            <div className="mt-3">
              {request.resolvedAt ? (
                <ConfirmButton
                  action={reopen}
                  triggerLabel="Reopen"
                  title="Reopen this request?"
                  description="It will move back to the open queue."
                  confirmLabel="Reopen"
                  variant="secondary"
                />
              ) : (
                <ConfirmButton
                  action={resolve}
                  triggerLabel="Mark as handled"
                  title="Mark this request as handled?"
                  description="It will move out of the open queue. You can reopen it later if needed."
                  confirmLabel="Mark handled"
                  variant="primary"
                />
              )}
            </div>
          </Card>
          <Card>
            <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">
              Internal note
            </p>
            <SupportNoteForm
              requestId={request.id}
              initialNote={request.founderNote ?? ""}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
