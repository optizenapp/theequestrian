'use client';

type SelectionOption = {
  handle: string;
  label: string;
};

type Selections = {
  brandHandle: string;
  categoryCollectionHandle: string;
};

type Props = {
  brandOptions: SelectionOption[];
  categoryOptions: SelectionOption[];
  selections: Selections;
  setSelections: (next: Selections) => void;
};

export default function AutoCampaignSelectionSettings({
  brandOptions,
  categoryOptions,
  selections,
  setSelections,
}: Props) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">Campaign selections</h3>
      <p className="mt-1 text-xs text-gray-600">
        Scheduled brand and category campaigns use these saved choices.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-sm text-gray-700">
          <span className="font-medium">Brand campaign brand</span>
          <select
            value={selections.brandHandle}
            disabled={brandOptions.length === 0}
            onChange={(e) => setSelections({ ...selections, brandHandle: e.target.value })}
            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm disabled:bg-gray-100"
          >
            <option value="">Select brand</option>
            {brandOptions.map((option) => (
              <option key={option.handle} value={option.handle}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-700">
          <span className="font-medium">Category campaign category</span>
          <select
            value={selections.categoryCollectionHandle}
            disabled={categoryOptions.length === 0}
            onChange={(e) => setSelections({ ...selections, categoryCollectionHandle: e.target.value })}
            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm disabled:bg-gray-100"
          >
            <option value="">Select category</option>
            {categoryOptions.map((option) => (
              <option key={option.handle} value={option.handle}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
