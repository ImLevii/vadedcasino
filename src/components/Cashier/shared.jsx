import { createResource, createSignal } from "solid-js";
import { authedAPI, createNotification } from "../../util/api";
export function useCashierList(path, extra = () => ({})) {
  const [page, setPage] = createSignal(1),
    [search, setSearch] = createSignal(""),
    [draft, setDraft] = createSignal(""),
    [status, setStatusValue] = createSignal("");
  const query = () =>
    new URLSearchParams({
      page: page(),
      search: search(),
      status: status(),
      ...extra(),
    }).toString();
  const [data, { refetch }] = createResource(query, async (query) => {
    const result = await authedAPI(path + "?" + query, "GET");
    if (!result || result.error)
      return { error: result?.error || "CASHIER_UNAVAILABLE" };
    return result;
  });
  return {
    data,
    refetch,
    page,
    setPage,
    draft,
    setDraft,
    status,
    setStatus(value) {
      setPage(1);
      setStatusValue(value);
    },
    search(e) {
      e?.preventDefault();
      setPage(1);
      setSearch(draft().trim());
    },
  };
}
export function Pager(props) {
  return (
    <div class="adm-pagination">
      <span>
        {Number(props.list.data()?.total || 0).toLocaleString()} records · Page{" "}
        {props.list.data()?.page || 1} of {props.list.data()?.pages || 1}
      </span>
      <div class="adm-actions">
        <button
          class="adm-button"
          disabled={
            props.list.data.loading || (props.list.data()?.page || 1) <= 1
          }
          onClick={() => props.list.setPage(props.list.data().page - 1)}
        >
          Previous
        </button>
        <button
          class="adm-button"
          disabled={
            props.list.data.loading ||
            (props.list.data()?.page || 1) >= (props.list.data()?.pages || 1)
          }
          onClick={() => props.list.setPage(props.list.data().page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
export async function copyCashier(text) {
  try {
    await navigator.clipboard.writeText(text);
    createNotification("success", "Copied to clipboard.");
  } catch {
    createNotification("error", "Select and copy the text manually.");
  }
}
export function downloadCodes(codes) {
  const url = URL.createObjectURL(
    new Blob([codes.join("\n")], { type: "text/plain" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "cosmicluck-gift-cards.txt";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
