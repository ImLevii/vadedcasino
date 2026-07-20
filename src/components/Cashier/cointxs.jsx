import { createSignal, createEffect, onMount, For, Show } from 'solid-js';
import { authedAPI } from '../../util/api.jsx';

export default function AdminCoinsCashier() {
    const [data, setData] = createSignal([]);
    const [page, setPage] = createSignal(1);
    const [totalPages, setTotalPages] = createSignal(1);
    const [total, setTotal] = createSignal(0);
    const [isLoading, setIsLoading] = createSignal(false);
    const [params, setParams] = createSignal({});

    async function fetchCoins(overridePage) {
        if (isLoading()) return;
        setIsLoading(true);

        const currentPage = overridePage ?? page();
        try {
            const result = await authedAPI(`/admin/cashier/coins?sortBy=createdAt&sortOrder=DESC&page=${currentPage}${params()?.search ? `&search=${params()?.search}` : ''}`, 'GET', null);
            if (result?.data) {
                setData(result.data);
                setTotal(result.total);
                setTotalPages(result.totalPages);
                setPage(result.page);
            }
        } catch (e) {
            console.error('Failed to fetch coin transactions:', e);
        } finally {
            setIsLoading(false);
        }
    }

    async function loadPage(newPage) {
        if (newPage < 1 || newPage > totalPages()) return;
        setIsLoading(true);
        setPage(newPage);

        try {
            const result = await authedAPI(`/admin/cashier/coins?sortBy=createdAt&sortOrder=DESC&page=${newPage}${params()?.search ? `&search=${params()?.search}` : ''}`, 'GET', null);
            if (result?.data) {
                setData(result.data);
                setTotal(result.total);
                setTotalPages(result.totalPages);
                setPage(result.page);
            }
        } catch (e) {
            console.error('Failed to load page:', e);
        } finally {
            setIsLoading(false);
        }
    }

    onMount(() => {
        fetchCoins(1);
    });

    function formatAmount(amount) {
        const num = parseFloat(amount);
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getTypeColor(type) {
        switch (type) {
            case 'deposit': return '#1fd65f';
            case 'withdraw': return '#ff4d4d';
            case 'in': return '#1fd65f';
            case 'out': return '#ff4d4d';
            default: return '#ffffff';
        }
    }

    function getTypeLabel(type) {
        switch (type) {
            case 'deposit': return 'Deposit';
            case 'withdraw': return 'Withdraw';
            case 'in': return 'In';
            case 'out': return 'Out';
            default: return type;
        }
    }

    return (
        <div class="admin-crypto-cashier">
            <div class="admin-header">
                <h2>Coin Transactions</h2>
                <span class="total-count">{total()} total</span>
            </div>

            <div class="search-bar">
                <input
                    type="text"
                    placeholder="Search by username..."
                    onInput={(e) => setParams({ ...params(), search: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && fetchCoins(1)}
                />
                <button onClick={() => fetchCoins(1)} disabled={isLoading()}>
                    {isLoading() ? 'Loading...' : 'Search'}
                </button>
            </div>

            <div class="table-container">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>User</th>
                            <th>Amount</th>
                            <th>Type</th>
                            <th>Method</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        <Show when={!isLoading() || data().length > 0} fallback={
                            <tr><td colspan="6" class="loading-cell">Loading...</td></tr>
                        }>
                            <For each={data()} fallback={
                                <tr><td colspan="6" class="empty-cell">No transactions found</td></tr>
                            }>
                                {(row) => (
                                    <tr>
                                        <td>#{row.id}</td>
                                        <td>
                                            <a href={`/user/${row.userId}`} target="_blank" class="user-link">
                                                {row.username || `User #${row.userId}`}
                                            </a>
                                        </td>
                                        <td class="amount-cell">
                                            <span style={{ color: getTypeColor(row.type) }}>
                                                {row.type === 'withdraw' || row.type === 'out' ? '-' : '+'}
                                                {formatAmount(row.amount)}
                                            </span>
                                        </td>
                                        <td>
                                            <span class="type-badge" style={{ background: getTypeColor(row.type) + '22', color: getTypeColor(row.type) }}>
                                                {getTypeLabel(row.type)}
                                            </span>
                                        </td>
                                        <td>{row.method || '-'}</td>
                                        <td class="date-cell">{formatDate(row.createdAt)}</td>
                                    </tr>
                                )}
                            </For>
                        </Show>
                    </tbody>
                </table>
            </div>

            <Show when={totalPages() > 1}>
                <div class="pagination">
                    <button
                        class="page-btn"
                        onClick={() => loadPage(page() - 1)}
                        disabled={page() === 1 || isLoading()}
                    >
                        ‹ Prev
                    </button>

                    <span class="page-info">
                        Page {page()} of {totalPages()}
                    </span>

                    <button
                        class="page-btn"
                        onClick={() => loadPage(page() + 1)}
                        disabled={page() === totalPages() || isLoading()}
                    >
                        Next ›
                    </button>
                </div>
            </Show>

            <style>{`
                .admin-crypto-cashier {
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .admin-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .admin-header h2 {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 600;
                    color: #fff;
                }

                .total-count {
                    font-size: 13px;
                    color: #8a8a8a;
                    background: #1a1a1a;
                    padding: 4px 10px;
                    border-radius: 20px;
                }

                .search-bar {
                    display: flex;
                    gap: 8px;
                }

                .search-bar input {
                    flex: 1;
                    max-width: 320px;
                    padding: 8px 14px;
                    background: #0f0f0f;
                    border: 1px solid #2a2a2a;
                    border-radius: 6px;
                    color: #fff;
                    font-size: 14px;
                    outline: none;
                }

                .search-bar input:focus {
                    border-color: #1fd65f;
                }

                .search-bar button {
                    padding: 8px 16px;
                    background: #1fd65f;
                    border: none;
                    border-radius: 6px;
                    color: #000;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: opacity 0.15s;
                }

                .search-bar button:hover {
                    opacity: 0.85;
                }

                .search-bar button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .table-container {
                    overflow-x: auto;
                    border-radius: 8px;
                    border: 1px solid #2a2a2a;
                }

                .admin-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                }

                .admin-table th {
                    text-align: left;
                    padding: 12px 16px;
                    background: #141414;
                    color: #8a8a8a;
                    font-weight: 600;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    border-bottom: 1px solid #2a2a2a;
                }

                .admin-table td {
                    padding: 12px 16px;
                    color: #fff;
                    border-bottom: 1px solid #1e1e1e;
                }

                .admin-table tbody tr:hover {
                    background: #141414;
                }

                .user-link {
                    color: #1fd65f;
                    text-decoration: none;
                }

                .user-link:hover {
                    text-decoration: underline;
                }

                .amount-cell {
                    font-family: 'JetBrains Mono', monospace;
                    font-weight: 600;
                }

                .type-badge {
                    display: inline-block;
                    padding: 3px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .date-cell {
                    color: #8a8a8a;
                    font-size: 12px;
                }

                .loading-cell, .empty-cell {
                    text-align: center;
                    color: #8a8a8a;
                    padding: 40px !important;
                }

                .pagination {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 16px;
                    padding: 8px 0;
                }

                .page-btn {
                    padding: 6px 14px;
                    background: #1a1a1a;
                    border: 1px solid #2a2a2a;
                    border-radius: 6px;
                    color: #fff;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.15s;
                }

                .page-btn:hover:not(:disabled) {
                    border-color: #1fd65f;
                    color: #1fd65f;
                }

                .page-btn:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }

                .page-info {
                    font-size: 13px;
                    color: #8a8a8a;
                }
            `}</style>
        </div>
    );
}