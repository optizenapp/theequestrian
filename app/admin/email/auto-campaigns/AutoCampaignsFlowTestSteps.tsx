type Props = { tomorrowLabel: string };

export default function AutoCampaignsFlowTestSteps({ tomorrowLabel }: Props) {
  return (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-xs">
      <li>Enable master flow + all types + your 1-contact list above, then Save.</li>
      <li>Export snapshot (JSON) before changing slots.</li>
      <li>Pick type + hour → “Set tomorrow slot &amp; build” (Sydney tomorrow = {tomorrowLabel}).</li>
      <li>Open /admin/email/campaigns → pending → edit, send test, approve.</li>
      <li>POST run-release (or use release button in Test actions). Repeat for other types.</li>
      <li>Restore slots backup or upload snapshot JSON.</li>
    </ol>
  );
}
