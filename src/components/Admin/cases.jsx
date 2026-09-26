import { createMemo, createResource, createSignal, For, Show } from 'solid-js';
import { authedAPI, createNotification } from '../../util/api';
import Loader from '../Loader/loader';
import AdminMFA from '../MFA/adminmfa';

const EMPTY_ITEM_RANGE = {
    itemId: '',
    name: '',
    img: '',
    price: '',
    rangeFrom: '',
    rangeTo: '',
    percentage: ''
};

  const MAX_TICKETS = 100000;

  const CATALOG_PRICE_FILTERS = [
    { key: 'all', label: 'All prices' },
    { key: 'under-1', label: '< $1' },
    { key: '1-10', label: '$1 - $10' },
    { key: '10-100', label: '$10 - $100' },
    { key: '100+', label: '$100+' }
  ];

  const CATALOG_VARIANT_FILTERS = [
    { key: 'all', label: 'All variants' },
    { key: 'stattrak', label: 'StatTrak' },
    { key: 'souvenir', label: 'Souvenir' },
    { key: 'standard', label: 'Standard' }
  ];

  const CATALOG_SELECTION_FILTERS = [
    { key: 'all', label: 'All items' },
    { key: 'selected', label: 'Selected' },
    { key: 'available', label: 'Available' }
  ];

  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function formatPrice(value) {
    return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatPercent(value) {
    return Number(value || 0).toFixed(2);
  }

  function getItemTicketCount(item, mode) {
    if (!item) return 0;

    if (mode === 'ranges') {
      const from = toNumber(item.rangeFrom);
      const to = toNumber(item.rangeTo);
      if (!from || !to || to < from) return 0;
      return Math.max(0, Math.floor(to - from + 1));
    }

    const chance = toNumber(item.percentage);
    if (!chance) return 0;
    return Math.max(0, Math.round((chance / 100) * MAX_TICKETS));
  }

  function getItemChancePercent(item, mode) {
    if (!item) return 0;

    if (mode === 'ranges') {
      return (getItemTicketCount(item, mode) / MAX_TICKETS) * 100;
    }

    return toNumber(item.percentage);
  }

  function buildChanceLabel(item, mode) {
    const tickets = getItemTicketCount(item, mode);
    const percent = getItemChancePercent(item, mode);
    return `${formatPercent(percent)}% = ${tickets.toLocaleString()} / ${MAX_TICKETS.toLocaleString()} tickets`;
  }

  function buildItemFromCatalog(item) {
    return {
      itemId: item?.itemId?.toString?.() || '',
      name: item?.name || '',
      img: item?.img || '',
      price: item?.price?.toString?.() || '',
      type: item?.type || '',
      rarity: item?.rarity || '',
      exterior: item?.exterior || '',
      marketHashName: item?.marketHashName || '',
      rangeFrom: '',
      rangeTo: '',
      percentage: ''
    };
  }

  function matchesCatalogPriceFilter(price, filter) {
    const value = toNumber(price);

    if (filter === 'under-1') return value > 0 && value < 1;
    if (filter === '1-10') return value >= 1 && value < 10;
    if (filter === '10-100') return value >= 10 && value < 100;
    if (filter === '100+') return value >= 100;

    return true;
  }

  function normalizeCatalogValue(value) {
    return value || 'Unknown';
  }

  function resolvePreviewSrc(path) {
    if (!path || typeof path !== 'string') return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
    const base = import.meta.env.VITE_SERVER_URL || '';
    return `${base}${path}`;
  }

  function ImageUploadBox(props) {
    let inputRef;

    async function handleFiles(fileList) {
      const file = fileList?.[0];
      if (!file) return;
      await props.onFile(file);
    }

    async function onDrop(event) {
      event.preventDefault();
      event.stopPropagation();
      await handleFiles(event.dataTransfer?.files);
    }

    function onDragOver(event) {
      event.preventDefault();
      event.stopPropagation();
    }

    return (
      <div class='upload-box' style={{ display: 'grid', 'grid-template-columns': '84px 1fr', gap: '8px', 'align-items': 'center' }}>
        <div class='upload-preview' style={{ width: '84px', height: '54px', border: '1px solid rgba(255,255,255,0.08)', 'border-radius': '6px', overflow: 'hidden', background: '#0f131a' }}>
          <Show
            when={props.previewPath}
            fallback={(
              <div
                class='upload-empty'
                style={{ width: '100%', height: '100%', display: 'flex', 'align-items': 'center', 'justify-content': 'center', color: '#8b92a0', 'font-size': '9px', 'font-weight': 700, 'text-transform': 'uppercase', 'letter-spacing': '0.08em' }}
              >
                No image selected
              </div>
            )}
          >
            <img src={resolvePreviewSrc(props.previewPath)} alt='preview' />
          </Show>
        </div>

        <div
          class='upload-dropzone'
          style={{ 'min-height': '54px', border: '1px dashed rgba(255,255,255,0.2)', 'border-radius': '6px', background: '#171c26', display: 'flex', 'align-items': 'center', 'justify-content': 'center', padding: '6px 8px', 'text-align': 'center', cursor: 'pointer' }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onClick={() => inputRef?.click()}
        >
          <p style={{ margin: 0, color: '#aeb6c5', 'font-size': '11px', 'font-weight': 700, 'line-height': 1.3 }}>
            {props.uploading ? 'Uploading...' : 'Drop image here or click to browse'}
          </p>
        </div>

        <input
          ref={inputRef}
          type='file'
          accept='image/*'
          onChange={async (event) => {
            await handleFiles(event.target.files);
            event.target.value = '';
          }}
          style={{ display: 'none' }}
        />
      </div>
    );
  }

function AdminCases() {

    const [resource, { mutate, refetch }] = createResource(fetchCases);
  const [catalogResource, {refetch: refetchCatalog}] = createResource(fetchCatalog);

    const [cases, setCases] = createSignal([]);
    const [caseQuery, setCaseQuery] = createSignal('');
    const [editorTab, setEditorTab] = createSignal('drops');
    const [selectedId, setSelectedId] = createSignal(null);
    const [detailLoading, setDetailLoading] = createSignal(false);

    const [name, setName] = createSignal('');
    const [slug, setSlug] = createSignal('');
    const [img, setImg] = createSignal('');
    const [price, setPrice] = createSignal('');
    const [mode, setMode] = createSignal('percentages');
    const [items, setItems] = createSignal([]);
    const [catalogQuery, setCatalogQuery] = createSignal('');
    const [catalogSelectionFilter, setCatalogSelectionFilter] = createSignal('all');
    const [catalogPriceFilter, setCatalogPriceFilter] = createSignal('all');
    const [catalogTypeFilter, setCatalogTypeFilter] = createSignal('all');
    const [catalogRarityFilter, setCatalogRarityFilter] = createSignal('all');
    const [catalogExteriorFilter, setCatalogExteriorFilter] = createSignal('all');
    const [catalogVariantFilter, setCatalogVariantFilter] = createSignal('all');
    const [catalogSort, setCatalogSort] = createSignal('price-desc');

    const [activeVersionId, setActiveVersionId] = createSignal(null);
    const [versions, setVersions] = createSignal([]);
    const stats = createMemo(() => {
      const expectedValue = items().reduce((sum,item) => sum + toNumber(item.price) * getItemChancePercent(item,mode()) / 100,0);
      const casePrice = toNumber(price()) || expectedValue;
      return {expectedValue,houseEdge:casePrice>0?(1-expectedValue/casePrice)*100:0};
    });

    const [saving, setSaving] = createSignal(false);
    const [uploadingCaseImage, setUploadingCaseImage] = createSignal(false);
    const [uploadingItemIndex, setUploadingItemIndex] = createSignal(null);
    const [needsMfa, setNeedsMfa] = createSignal(false);

    const isEditing = createMemo(() => !!selectedId());

    const filteredCases = createMemo(() => {
      const query = caseQuery().trim().toLowerCase();
      if (!query) return cases();

      return cases().filter((entry) => {
        return `${entry.id} ${entry.name} ${entry.slug}`.toLowerCase().includes(query);
      });
    });

    const catalogItems = createMemo(() => {
      // Precompute lowercase search text and selection key once per catalog load
      return (catalogResource() || []).map((item) => ({
        ...item,
        _search: `${item.itemId} ${item.name} ${item.marketHashName || ''} ${item.type || ''} ${item.rarity || ''} ${item.exterior || ''}`.toLowerCase(),
        _key: item?.itemId?.toString?.() || `${item?.name}::${item?.img}`
      }));
    });

    const selectedCatalogKeys = createMemo(() => {
      const keys = new Set();
      for (const entry of items()) {
        if (entry.itemId) keys.add(entry.itemId.toString());
        keys.add(`${entry.name}::${entry.img}`);
      }
      return keys;
    });

    function isCatalogSelected(item) {
      const keys = selectedCatalogKeys();
      const normalizedId = item?.itemId?.toString?.() || '';
      if (normalizedId && keys.has(normalizedId)) return true;
      return keys.has(`${item?.name}::${item?.img}`);
    }

    const CATALOG_RENDER_LIMIT = 150;

    const filteredCatalogItems = createMemo(() => {
      const query = catalogQuery().trim().toLowerCase();
      let list = catalogItems();

      if (query) {
        list = list.filter((item) => item._search.includes(query));
      }

      if (catalogSelectionFilter() === 'selected') {
        list = list.filter((item) => isCatalogSelected(item));
      } else if (catalogSelectionFilter() === 'available') {
        list = list.filter((item) => !isCatalogSelected(item));
      }

      if (catalogPriceFilter() !== 'all') {
        list = list.filter((item) => matchesCatalogPriceFilter(item.price, catalogPriceFilter()));
      }

      if (catalogTypeFilter() !== 'all') {
        list = list.filter((item) => normalizeCatalogValue(item.type) === catalogTypeFilter());
      }

      if (catalogRarityFilter() !== 'all') {
        list = list.filter((item) => normalizeCatalogValue(item.rarity) === catalogRarityFilter());
      }

      if (catalogExteriorFilter() !== 'all') {
        list = list.filter((item) => normalizeCatalogValue(item.exterior) === catalogExteriorFilter());
      }

      if (catalogVariantFilter() === 'stattrak') {
        list = list.filter((item) => item.isStatTrak);
      } else if (catalogVariantFilter() === 'souvenir') {
        list = list.filter((item) => item.isSouvenir);
      } else if (catalogVariantFilter() === 'standard') {
        list = list.filter((item) => !item.isStatTrak && !item.isSouvenir);
      }

      // Copy before sorting to avoid mutating the memoized source list
      list = [...list];

      if (catalogSort() === 'price-asc') {
        list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
      } else if (catalogSort() === 'name-asc') {
        list.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
      }

      return list;
    });

    const visibleCatalogItems = createMemo(() => filteredCatalogItems().slice(0, CATALOG_RENDER_LIMIT));

    const catalogStats = createMemo(() => {
      const selectedCount = catalogItems().filter((item) => isCatalogSelected(item)).length;
      return {
        total: catalogItems().length,
        filtered: filteredCatalogItems().length,
        selected: selectedCount,
        available: Math.max(0, catalogItems().length - selectedCount)
      };
    });

    const catalogTypeOptions = createMemo(() => ['all', ...new Set(catalogItems().map((item) => normalizeCatalogValue(item.type)).sort())]);
    const catalogRarityOptions = createMemo(() => ['all', ...new Set(catalogItems().map((item) => normalizeCatalogValue(item.rarity)).sort())]);
    const catalogExteriorOptions = createMemo(() => ['all', ...new Set(catalogItems().map((item) => normalizeCatalogValue(item.exterior)).sort())]);

    const chanceSummary = createMemo(() => {
      const currentItems = items();
      const totalTickets = currentItems.reduce((acc, item) => acc + getItemTicketCount(item, mode()), 0);
      const totalPercent = currentItems.reduce((acc, item) => acc + getItemChancePercent(item, mode()), 0);
      const completeItems = currentItems.filter((item) => item.name?.trim() && toNumber(item.price) > 0).length;

      return {
        totalTickets,
        totalPercent,
        itemCount: currentItems.length,
        completeItems,
        isComplete: currentItems.length > 0 && completeItems === currentItems.length,
        isChanceValid: mode() === 'percentages'
          ? Math.abs(totalPercent - 100) <= 0.01 && currentItems.every(item => toNumber(item.percentage) > 0 && toNumber(item.percentage) <= 100)
          : totalTickets === MAX_TICKETS && [...currentItems].sort((a,b)=>Number(a.rangeFrom)-Number(b.rangeFrom)).every((item,index,list)=>
              Number.isInteger(Number(item.rangeFrom)) && Number.isInteger(Number(item.rangeTo)) && Number(item.rangeTo) >= Number(item.rangeFrom) && Number(item.rangeFrom) === (index ? Number(list[index-1].rangeTo)+1 : 1))
      };
    });

    const editorStatus = createMemo(() => {
      const missing = [];
      if (!name().trim()) missing.push('name');
      if (!slug().trim()) missing.push('slug');
      if (!items().length) missing.push('items');
      if (items().length && !chanceSummary().isComplete) missing.push('complete item names/prices');
      if (price() && toNumber(price()) <= 0) missing.push('positive price');
      if (items().length && !chanceSummary().isChanceValid) missing.push(mode() === 'percentages' ? '100% chance total' : 'continuous ticket ranges (1-100000)');

      return {
        missing,
        ready: missing.length === 0
      };
    });

    async function fetchCases() {
        const res = await authedAPI('/admin/cases', 'GET', null);

        if (res?.error === '2FA_REQUIRED') return mutate({ mfa: true });

        setCases(res?.data || []);
        return mutate(res);
    }

      async function fetchCatalog() {
        const res = await authedAPI('/admin/cases/catalog', 'GET', null);

        if (res?.error === '2FA_REQUIRED') {
          setNeedsMfa(true);
          return [];
        }

        return res?.data || [];
      }

    function computeSlugFromName(value) {
        return (value || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }

    function resetForm() {
        setSelectedId(null);
        setEditorTab('drops');
        setName('');
        setSlug('');
        setImg('');
        setPrice('');
      setMode('percentages');
          setItems([]);
        setActiveVersionId(null);
        setVersions([]);
    }

    function addItem() {
        if (items().length >= 20) return createNotification('error', 'You can select up to 20 items.');
        setItems((prev) => [...prev, { ...EMPTY_ITEM_RANGE }]);
    }

    function removeItem(index) {
      setItems((prev) => prev.filter((_, i) => i !== index));
    }

    function setItemValue(index, key, value) {
        setItems((prev) => prev.map((item, i) => i === index ? { ...item, [key]: value } : item));
    }

    function changeMode(next) {
      if (next===mode()) return;
      if (next==='percentages') {
        setItems(prev=>prev.map(item=>({...item,percentage:String(getItemChancePercent(item,'ranges'))})));
      } else if (items().length && chanceSummary().isChanceValid) {
        const weighted=items().map((item,index)=>({item,index,tickets:Math.floor(toNumber(item.percentage)*1000),fraction:toNumber(item.percentage)*1000%1}));
        let remaining=MAX_TICKETS-weighted.reduce((sum,entry)=>sum+entry.tickets,0);
        for(const entry of [...weighted].sort((a,b)=>b.fraction-a.fraction)) { if(remaining>0){entry.tickets++;remaining--;} }
        let cursor=1;
        setItems(weighted.map(({item,tickets})=>{const result={...item,rangeFrom:String(cursor),rangeTo:String(cursor+tickets-1)};cursor+=tickets;return result;}));
      }
      setMode(next);
    }

    function distributeChances() {
      const currentItems = items();
      if (!currentItems.length) {
        createNotification('error', 'Add at least one item first.');
        return;
      }

      if (mode() === 'ranges') {
        const baseTickets = Math.floor(MAX_TICKETS / currentItems.length);
        let cursor = 1;

        setItems((prev) => prev.map((item, index) => {
          const tickets = index === prev.length - 1 ? MAX_TICKETS - cursor + 1 : baseTickets;
          const rangeFrom = cursor;
          const rangeTo = cursor + tickets - 1;
          cursor = rangeTo + 1;

          return {
            ...item,
            rangeFrom: rangeFrom.toString(),
            rangeTo: rangeTo.toString(),
            percentage: ''
          };
        }));
        return;
      }

      const basePercent = Math.floor((100 / currentItems.length) * 10000) / 10000;
      let assigned = 0;

      setItems((prev) => prev.map((item, index) => {
        const percentage = index === prev.length - 1
          ? Number((100 - assigned).toFixed(4))
          : basePercent;
        assigned += percentage;

        return {
          ...item,
          percentage: percentage.toString(),
          rangeFrom: '',
          rangeTo: ''
        };
      }));
    }

    function isCatalogDuplicate(item) {
      const normalizedId = item?.itemId?.toString?.() || '';
      return items().some((entry) => {
        if (normalizedId && entry.itemId) return entry.itemId.toString() === normalizedId;
        return entry.name === item?.name && entry.img === item?.img;
      });
    }

    function addCatalogItem(item) {
      if (items().length >= 20) {
        createNotification('error', 'You can select up to 20 items.');
        return;
      }

      if (isCatalogDuplicate(item)) {
        createNotification('error', 'This item is already in the case.');
        return;
      }

      setItems((prev) => [...prev, buildItemFromCatalog(item)]);
    }

    async function loadCase(caseId) {
        setDetailLoading(true);

        const res = await authedAPI(`/admin/cases/${caseId}`, 'GET', null, true);
        setDetailLoading(false);

        if (!res?.success) return;

        const data = res.data;
        const active = data.activeVersion;

        setSelectedId(data.id);
        setEditorTab('drops');
        setName(data.name || '');
        setSlug(data.slug || '');
        setImg(data.img || '');
        setPrice(active?.price?.toString?.() || '');
        setActiveVersionId(active?.id || null);
        setVersions(data.versions || []);

        const mappedItems = (active?.items || []).map((item) => ({
            itemId: item.itemId || '',
            name: item.name || '',
            img: item.img || '',
            price: item.price?.toString?.() || '',
            type: item.type || '',
            rarity: item.rarity || '',
            exterior: item.exterior || '',
            marketHashName: item.marketHashName || '',
            rangeFrom: item.rangeFrom?.toString?.() || '',
            rangeTo: item.rangeTo?.toString?.() || '',
            percentage: item.probability?.toString?.() || ''
        }));

        setItems(mappedItems);

        const hasManualRanges = mappedItems.some((item) => !!item.rangeFrom || !!item.rangeTo);
        setMode(hasManualRanges ? 'ranges' : 'percentages');
    }

      async function uploadLocalImage(file, target) {
        if (!file) return null;

        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await authedAPI('/admin/cases/upload', 'POST', JSON.stringify({
          target,
          fileName: file.name,
          dataUrl
        }), true);

        if (!res?.success) return null;
        return res.data?.path || null;
      }

      async function uploadCaseImage(file) {
        if (!file) return;

        setUploadingCaseImage(true);

        try {
          const uploadedPath = await uploadLocalImage(file, 'case');
          if (uploadedPath) {
            setImg(uploadedPath);
            createNotification('success', 'Case image uploaded.');
          }
        } catch (e) {
          console.error(e);
          createNotification('error', 'Failed to upload case image.');
        } finally {
          setUploadingCaseImage(false);
        }
      }

      async function uploadItemImage(index, file) {
        if (!file) return;

        setUploadingItemIndex(index);

        try {
          const uploadedPath = await uploadLocalImage(file, 'item');
          if (uploadedPath) {
            setItemValue(index, 'img', uploadedPath);
            createNotification('success', `Item #${index + 1} image uploaded.`);
          }
        } catch (e) {
          console.error(e);
          createNotification('error', `Failed to upload item #${index + 1} image.`);
        } finally {
          setUploadingItemIndex(null);
        }
      }

    function buildPayload() {
        const payloadItems = items().map((item) => ({
            itemId: item.itemId === '' ? null : item.itemId,
            name: item.name,
            img: item.img || null,
            price: item.price,
            rangeFrom: mode() === 'ranges' ? item.rangeFrom : undefined,
            rangeTo: mode() === 'ranges' ? item.rangeTo : undefined,
            percentage: mode() === 'percentages' ? item.percentage : undefined
        }));

        return {
            name: name(),
            slug: slug(),
            img: img() || null,
            price: price(),
            mode: mode(),
            items: payloadItems
        };
    }

    async function saveCase() {
        if (saving()) return;
        if (!editorStatus().ready) return createNotification('error', `Check ${editorStatus().missing.join(', ')} before saving.`);
        if (!name().trim()) return createNotification('error', 'Case name is required.');
        if (!slug().trim()) return createNotification('error', 'Slug is required.');

        setSaving(true);

        const payload = buildPayload();
        const endpoint = isEditing() ? `/admin/cases/${selectedId()}` : '/admin/cases';
        const method = isEditing() ? 'PUT' : 'POST';

        const res = await authedAPI(endpoint, method, JSON.stringify(payload), true);

        setSaving(false);

        if (!res?.success) return;

        createNotification('success', isEditing() ? 'Case updated.' : 'Case created.');
        await refetch();

        if (!isEditing() && res?.data?.id) {
            await loadCase(res.data.id);
        } else if (isEditing()) {
            await loadCase(selectedId());
        }
    }

    async function createVersion() {
        if (saving()) return;
        if (!editorStatus().ready) return createNotification('error', `Check ${editorStatus().missing.join(', ')} before saving.`);
        if (!selectedId()) return createNotification('error', 'Select a case first.');

        setSaving(true);

        const payload = buildPayload();
        const res = await authedAPI(`/admin/cases/${selectedId()}/version`, 'POST', JSON.stringify(payload), true);

        setSaving(false);

        if (!res?.success) return;

        createNotification('success', 'New case version created.');
        await refetch();
        await loadCase(selectedId());
    }

    async function deleteCase() {
        if (!selectedId()) return;

        if (!confirm('Hard delete this case? This only works when no openings reference it.')) return;

        const res = await authedAPI(`/admin/cases/${selectedId()}`, 'DELETE', null, true);
        if (!res?.success) return;

        createNotification('success', 'Case deleted.');
        resetForm();
        await refetch();
    }

    return (
        <>
            {(resource()?.mfa || needsMfa()) && <AdminMFA refetch={async () => {
              setNeedsMfa(false);
              await Promise.all([refetch(), refetchCatalog()]);
            }} />}

            <header class='cases-heading'><div><span class='eyebrow'>CASE MANAGEMENT</span><h1>Case library</h1><p>Manage artwork, pricing and item drop chances.</p></div><div class='library-count'><strong>{cases().length}</strong><span>Cases in library</span></div></header>
            <div class='admin-cases'>
                <div class='cases-list card'>
                    <div class='row between'>
                        <p class='title'>YOUR CASES</p>
                        <button class='btn green' onClick={resetForm}>+ New case</button>
                    </div>

                    <input
                      class='case-search'
                      value={caseQuery()}
                      onInput={(e) => setCaseQuery(e.target.value)}
                      placeholder='Search cases...'
                    />

                    <div class='sidebar-metrics'>
                      <div><span>Total</span><strong>{cases().length}</strong></div>
                      <div><span>Shown</span><strong>{filteredCases().length}</strong></div>
                    </div>

                    <Show when={!resource.loading} fallback={<Loader />}>
                        <Show when={cases().length} fallback={<p class='muted'>No cases yet.</p>}>
                            <div class='case-items'>
                                <Show when={filteredCases().length} fallback={<p class='muted'>No cases match your search.</p>}>
                                <For each={filteredCases()}>{(entry) => (
                                    <button
                                        class={`case-row ${selectedId() === entry.id ? 'active' : ''}`}
                                        onClick={() => loadCase(entry.id)}
                                    >
                                        <img class='case-thumb' src={resolvePreviewSrc(entry.img)} alt=''/>
                                        <div class='left'>
                                            <p>{entry.name}</p>
                                            <span>#{entry.id} • {entry.slug}</span>
                                        </div>
                                        <div class='right'>
                                            <span>{Number(entry.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            <small>{entry.itemCount} items</small>
                                        </div>
                                    </button>
                                )}</For>
                                    </Show>
                            </div>
                        </Show>
                    </Show>
                </div>

                <div class='case-editor card'>
                    <Show when={!detailLoading()} fallback={<Loader />}>
                        <div class='row between'>
                            <div class='editor-heading'><span class='eyebrow'>{isEditing() ? 'EDIT CASE' : 'NEW CASE'}</span><h2>{name() || 'Create a case'}</h2></div>
                            <div class='row'>
                                <button class='btn green save-case' disabled={saving() || !editorStatus().ready} onClick={saveCase}>
                                    {saving() ? 'Saving...' : 'Save case'}
                                </button>
                                <Show when={isEditing()}>
                                    <button class='btn purple' disabled={saving() || !editorStatus().ready} onClick={createVersion}>NEW VERSION</button>
                                    <button class='btn red' disabled={saving()} onClick={deleteCase}>DELETE</button>
                                </Show>
                            </div>
                        </div>

                        <div class='form-grid'>
                            <div class='field'>
                                <label>NAME</label>
                                <input
                                    value={name()}
                                    onInput={(e) => {
                                        const value = e.target.value;
                                        setName(value);
                                        if (!isEditing()) setSlug(computeSlugFromName(value));
                                    }}
                                    placeholder='Case Name'
                                />
                            </div>

                            <div class='field'>
                                <label>SLUG</label>
                                <input value={slug()} onInput={(e) => setSlug(computeSlugFromName(e.target.value))} placeholder='case-slug' />
                            </div>

                            <div class='field'>
                                <label>IMAGE PATH / URL</label>
                                <input value={img()} onInput={(e) => setImg(e.target.value)} placeholder='/public/cases/case.png or https://...' />
                                <ImageUploadBox
                                    previewPath={img()}
                                    uploading={uploadingCaseImage()}
                                    onFile={uploadCaseImage}
                                />
                                <small class='helper'>{uploadingCaseImage() ? 'Uploading case image...' : 'Upload local image to auto-fill path'}</small>
                            </div>

                            <div class='field'>
                                <label>CASE PRICE</label>
                                <input value={price()} onInput={(e) => setPrice(e.target.value)} placeholder='Auto if empty' />
                            </div>
                        </div>

                        <div class='stat-row'>
                            <p>Expected Value: <span>{Number(stats().expectedValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                            <p>House Edge: <span>{Number(stats().houseEdge || 0).toFixed(4)}%</span></p>
                        </div>

                        <div class={`editor-status ${editorStatus().ready ? 'ready' : 'needs-work'}`}>
                          <div>
                            <p>{editorStatus().ready ? 'Ready to save' : 'Needs attention'}</p>
                            <span>
                              {editorStatus().ready
                                ? 'Case setup is complete and chance totals are valid.'
                                : `Missing: ${editorStatus().missing.join(', ')}`}
                            </span>
                          </div>
                          <strong>{formatPercent(chanceSummary().totalPercent)}%</strong>
                        </div>

                        <nav class='editor-tabs' aria-label='Case editor sections'><button classList={{active:editorTab()==='drops'}} onClick={()=>setEditorTab('drops')}>Drop table <span>{items().length}</span></button><button classList={{active:editorTab()==='catalog'}} onClick={()=>setEditorTab('catalog')}>Add catalog items <span>{catalogStats().total.toLocaleString()}</span></button></nav>
                        <div class='drop-controls' classList={{hidden:editorTab()!=='drops'}}><div class='row'><button class={`btn sm ${mode()==='percentages'?'green':'gray'}`} onClick={()=>changeMode('percentages')}>Percentages</button><button class={`btn sm ${mode()==='ranges'?'green':'gray'}`} onClick={()=>changeMode('ranges')}>Ticket ranges</button></div><div class='row'><button class='btn sm gray' onClick={distributeChances}>Equal chances</button><button class='btn sm green' disabled={items().length>=20} onClick={addItem}>+ Custom item</button></div></div>
                        <div class='items-head' classList={{hidden:editorTab()!=='catalog'}}>
                          <div class='row between items-toolbar'>
                            <div>
                              <p class='title small'>SELECT UP TO 20 ITEMS</p>
                              <p class='muted'>Browse the catalog, filter what you want, then assign chances in tickets or ranges.</p>
                            </div>

                            <div class='row controls-wrap'>
                              <input
                                class='catalog-search'
                                value={catalogQuery()}
                                onInput={(e) => setCatalogQuery(e.target.value)}
                                placeholder='Search items by name or ID...'
                              />
                              <div class='chip-group'>
                                <For each={CATALOG_SELECTION_FILTERS}>{(filter) => (
                                  <button
                                    class={`chip ${catalogSelectionFilter() === filter.key ? 'active' : ''}`}
                                    onClick={() => setCatalogSelectionFilter(filter.key)}
                                  >
                                    {filter.label}
                                  </button>
                                )}</For>
                              </div>
                              <div class='chip-group'>
                                <For each={CATALOG_PRICE_FILTERS}>{(filter) => (
                                  <button
                                    class={`chip ${catalogPriceFilter() === filter.key ? 'active' : ''}`}
                                    onClick={() => setCatalogPriceFilter(filter.key)}
                                  >
                                    {filter.label}
                                  </button>
                                )}</For>
                              </div>
                              <button class={`btn sm ${mode() === 'percentages' ? 'green' : 'gray'}`} onClick={() => changeMode('percentages')}>PERCENTAGES</button>
                              <button class={`btn sm ${mode() === 'ranges' ? 'green' : 'gray'}`} onClick={() => changeMode('ranges')}>RANGES</button>
                              <button class='btn sm purple' onClick={distributeChances}>DISTRIBUTE</button>
                              <button class='btn sm gray' onClick={addItem}>+ ITEM</button>
                            </div>
                          </div>

                          <div class='catalog-metrics'>
                            <div><span>Total</span><strong>{catalogStats().total}</strong></div>
                            <div><span>Filtered</span><strong>{catalogStats().filtered}</strong></div>
                            <div><span>Selected</span><strong>{catalogStats().selected}</strong></div>
                            <div><span>Available</span><strong>{catalogStats().available}</strong></div>
                          </div>

                          <div class='builder-grid'>
                            <div class='catalog-panel card-inner'>
                              <div class='row between catalog-head'>
                                <p class='title small'>ITEM CATALOG</p>
                                <div class='row'>
                                  <p class='helper'>{catalogStats().filtered} visible</p>
                                  <button class='btn sm gray' onClick={() => {
                                    setCatalogQuery('');
                                    setCatalogSelectionFilter('all');
                                    setCatalogPriceFilter('all');
                                    setCatalogTypeFilter('all');
                                    setCatalogRarityFilter('all');
                                    setCatalogExteriorFilter('all');
                                    setCatalogVariantFilter('all');
                                    setCatalogSort('price-desc');
                                  }}>RESET</button>
                                </div>
                              </div>

                              <div class='catalog-toolbar'>
                                <div class='chip-group'>
                                  <button class={`chip ${catalogSort() === 'price-desc' ? 'active' : ''}`} onClick={() => setCatalogSort('price-desc')}>Price desc</button>
                                  <button class={`chip ${catalogSort() === 'price-asc' ? 'active' : ''}`} onClick={() => setCatalogSort('price-asc')}>Price asc</button>
                                  <button class={`chip ${catalogSort() === 'name-asc' ? 'active' : ''}`} onClick={() => setCatalogSort('name-asc')}>Name</button>
                                </div>
                                <div class='catalog-selects'>
                                  <select value={catalogTypeFilter()} onChange={(e) => setCatalogTypeFilter(e.target.value)}>
                                    <For each={catalogTypeOptions()}>{(option) => <option value={option}>{option === 'all' ? 'All types' : option}</option>}</For>
                                  </select>
                                  <select value={catalogRarityFilter()} onChange={(e) => setCatalogRarityFilter(e.target.value)}>
                                    <For each={catalogRarityOptions()}>{(option) => <option value={option}>{option === 'all' ? 'All rarities' : option}</option>}</For>
                                  </select>
                                  <select value={catalogExteriorFilter()} onChange={(e) => setCatalogExteriorFilter(e.target.value)}>
                                    <For each={catalogExteriorOptions()}>{(option) => <option value={option}>{option === 'all' ? 'All exteriors' : option}</option>}</For>
                                  </select>
                                </div>
                                <div class='chip-group'>
                                  <For each={CATALOG_VARIANT_FILTERS}>{(filter) => (
                                    <button
                                      class={`chip ${catalogVariantFilter() === filter.key ? 'active' : ''}`}
                                      onClick={() => setCatalogVariantFilter(filter.key)}
                                    >
                                      {filter.label}
                                    </button>
                                  )}</For>
                                </div>
                              </div>

                              <div class='catalog-grid'>
                                <Show when={!catalogResource.loading} fallback={<div class='catalog-empty'>Loading catalog...</div>}>
                                <Show when={filteredCatalogItems().length} fallback={<div class='catalog-empty'>No items match your search or filters.</div>}>
                                  <For each={visibleCatalogItems()}>{(entry) => (
                                    <button
                                      class={`catalog-card ${isCatalogSelected(entry) ? 'selected' : ''}`}
                                      onClick={() => addCatalogItem(entry)}
                                      disabled={isCatalogSelected(entry)}
                                      title={entry?.name || ''}
                                    >
                                      <Show when={isCatalogSelected(entry)}>
                                        <div class='catalog-selected-badge'>SELECTED</div>
                                      </Show>
                                      <div class='catalog-thumb'>
                                        <Show when={entry?.img} fallback={<div class='catalog-thumb-empty'>NO IMG</div>}>
                                          <img src={resolvePreviewSrc(entry.img)} alt={entry?.name || 'item'} loading='lazy' />
                                        </Show>
                                      </div>
                                      <div class='catalog-meta'>
                                        <p class='catalog-name'>{entry?.name}</p>
                                        <span class='catalog-id'>{entry?.type || 'Counter-Strike'}{entry?.exterior ? ` / ${entry.exterior}` : ''}</span>
                                        <Show when={entry?.rarity || entry?.isStatTrak || entry?.isSouvenir}>
                                          <small class='catalog-tags'>
                                            {[entry?.rarity, entry?.isStatTrak ? 'StatTrak' : '', entry?.isSouvenir ? 'Souvenir' : ''].filter(Boolean).join(' / ')}
                                          </small>
                                        </Show>
                                      </div>
                                      <div class='catalog-price'>${formatPrice(entry?.price)}</div>
                                    </button>
                                  )}</For>
                                  <Show when={filteredCatalogItems().length > CATALOG_RENDER_LIMIT}>
                                    <div class='catalog-empty'>
                                      Showing first {CATALOG_RENDER_LIMIT} of {filteredCatalogItems().length} items — refine your search or filters to narrow down.
                                    </div>
                                  </Show>
                                </Show>
                                </Show>
                              </div>
                            </div>

                            <div class='chance-panel card-inner'>
                              <div class='row between chance-head'>
                                <p class='title small'>SET DROP CHANCES</p>
                                <p class='chance-total'>{formatPercent(chanceSummary().totalPercent)}%</p>
                              </div>

                              <div class='chance-summary'>
                                <div>
                                  <span>Selected items</span>
                                  <strong>{chanceSummary().itemCount}/20</strong>
                                </div>
                                <div>
                                  <span>Total tickets</span>
                                  <strong>{chanceSummary().totalTickets.toLocaleString()} / {MAX_TICKETS.toLocaleString()}</strong>
                                </div>
                                <div>
                                  <span>Chance total</span>
                                  <strong>{formatPercent(chanceSummary().totalPercent)}%</strong>
                                </div>
                              </div>

                              <div class='chance-stack'>
                                <Show when={items().length} fallback={<p class='muted'>Selected items will appear here with ticket math.</p>}>
                                  <For each={items()}>{(item, index) => (
                                    <div class='chance-row'>
                                      <div>
                                        <p>{item.name || `Item #${index() + 1}`}</p>
                                        <small>{buildChanceLabel(item, mode())}</small>
                                      </div>
                                      <button class='btn sm red' onClick={() => removeItem(index())}>REMOVE</button>
                                    </div>
                                  )}</For>
                                </Show>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div class='items-grid' classList={{hidden:editorTab()!=='drops'}}>
                          <Show when={items().length} fallback={<div class='empty-editor-state'><p>Build your drop table</p><span>Choose up to 20 items and assign their chances.</span><button class='btn green' onClick={()=>setEditorTab('catalog')}>Browse item catalog</button></div>}>
                            <For each={items()}>{(item,index)=><article class='drop-card'>
                              <div class='drop-main'><img class='drop-art' src={resolvePreviewSrc(item.img)} alt='' loading='lazy'/><div class='drop-name'><strong>{item.name || `Item #${index()+1}`}</strong><span>{formatPrice(item.price)} coins</span></div>
                                <div class='drop-odds'><Show when={mode()==='ranges'} fallback={<label>Chance %<input type='number' min='.001' max='100' step='.001' aria-label={`Chance for ${item.name || index()+1}`} value={item.percentage} onInput={e=>setItemValue(index(),'percentage',e.target.value)}/></label>}><label>From<input type='number' min='1' max='100000' aria-label={`First ticket for ${item.name || index()+1}`} value={item.rangeFrom} onInput={e=>setItemValue(index(),'rangeFrom',e.target.value)}/></label><label>To<input type='number' min='1' max='100000' aria-label={`Last ticket for ${item.name || index()+1}`} value={item.rangeTo} onInput={e=>setItemValue(index(),'rangeTo',e.target.value)}/></label></Show></div>
                                <button class='btn sm red' aria-label={`Remove ${item.name || 'item'}`} onClick={()=>removeItem(index())}>&times;</button>
                              </div>
                              <div class='odds-track'><span style={{width:`${Math.min(100,Math.max(0,getItemChancePercent(item,mode())))}%`}}/></div>
                              <details class='drop-details'><summary><span>Edit item details</span><strong>{buildChanceLabel(item,mode())}</strong></summary><div class='drop-fields'>
                                <label>Item name<input value={item.name} onInput={e=>setItemValue(index(),'name',e.target.value)}/></label><label>Item ID<input value={item.itemId} onInput={e=>setItemValue(index(),'itemId',e.target.value)}/></label>
                                <label>Image path / URL<input value={item.img} onInput={e=>setItemValue(index(),'img',e.target.value)}/></label><label>Item value<input type='number' min='.01' step='.01' value={item.price} onInput={e=>setItemValue(index(),'price',e.target.value)}/></label>
                                <ImageUploadBox previewPath={item.img} uploading={uploadingItemIndex()===index()} onFile={file=>uploadItemImage(index(),file)}/>
                              </div></details>
                            </article>}</For>
                          </Show>
                        </div>

                        <Show when={isEditing() && versions().length}>
                            <div class='versions'>
                                <p class='title small'>VERSION HISTORY</p>
                                <div class='version-list'>
                                    <For each={versions()}>{(version) => (
                                        <div class={`version-row ${activeVersionId() === version.id ? 'active' : ''}`}>
                                            <p>Version #{version.id}</p>
                                            <p>{Number(version.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                            <p>{version.itemCount} items</p>
                                            <p>{version.openingCount} openings</p>
                                            <p>{version.endedAt ? 'ENDED' : 'ACTIVE'}</p>
                                        </div>
                                    )}</For>
                                </div>
                            </div>
                        </Show>
                    </Show>
                </div>
            </div>

            <style jsx>{`
              .admin-cases {
                display: grid;
                grid-template-columns: 360px 1fr;
                gap: 16px;
                align-items: start;
              }

              .card {
                background: #12151c;
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 10px;
                padding: 16px;
              }

              .title {
                color: #c3cad6;
                font-size: 12px;
                letter-spacing: 0.08em;
                font-weight: 700;
                font-family: 'Geogrotesque Wide', sans-serif;
              }

              .title.small {
                font-size: 11px;
              }

              .row {
                display: flex;
                gap: 8px;
                align-items: center;
              }

              .between {
                justify-content: space-between;
              }

              .btn {
                border: 1px solid rgba(255,255,255,0.08);
                background: #1a1f29;
                color: #c3cad6;
                height: 34px;
                padding: 0 12px;
                border-radius: 6px;
                font-weight: 700;
                font-size: 11px;
                cursor: pointer;
                font-family: 'Geogrotesque Wide', sans-serif;
              }

              .btn.sm {
                height: 28px;
                font-size: 10px;
              }

              .btn.green {
                border-color: rgba(31,214,95,0.35);
                color: #1fd65f;
              }

              .btn.purple {
                border-color: rgba(166, 184, 173,0.35);
                color: #a6b8ad;
              }

              .btn.red {
                border-color: rgba(231,76,60,0.35);
                color: #e74c3c;
              }

              .btn.gray {
                color: #8b92a0;
              }

              .case-items {
                margin-top: 12px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-height: 70vh;
                overflow: auto;
              }

              .case-search {
                width: 100%;
                height: 34px;
                margin-top: 12px;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 6px;
                background: #1a1f29;
                color: #c3cad6;
                padding: 0 10px;
                font-size: 12px;
                font-weight: 600;
                font-family: 'Geogrotesque Wide', sans-serif;
                outline: none;
              }

              .case-search::placeholder {
                color: #6b7280;
              }

              .sidebar-metrics {
                margin-top: 10px;
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
              }

              .sidebar-metrics div {
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 8px;
                background: #151925;
                padding: 8px 10px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
              }

              .sidebar-metrics span {
                color: #8b92a0;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
              }

              .sidebar-metrics strong {
                color: #c3cad6;
                font-size: 12px;
                font-weight: 800;
              }

              .case-row {
                width: 100%;
                border: 1px solid rgba(255,255,255,0.08);
                background: #1a1f29;
                border-radius: 8px;
                padding: 10px;
                display: flex;
                justify-content: space-between;
                gap: 10px;
                text-align: left;
                color: #c3cad6;
                cursor: pointer;
              }

              .case-row.active {
                border-color: rgba(31,214,95,0.35);
                background: rgba(31,214,95,0.07);
              }

              .left p {
                font-size: 13px;
                font-weight: 700;
              }

              .left span {
                color: #8b92a0;
                font-size: 11px;
              }

              .right {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 2px;
              }

              .right span {
                color: #1fd65f;
                font-size: 12px;
                font-weight: 700;
              }

              .right small {
                color: #8b92a0;
                font-size: 10px;
              }

              .form-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-top: 14px;
              }

              .field {
                display: flex;
                flex-direction: column;
                gap: 6px;
              }

              .helper {
                color: #6b7280;
                font-size: 10px;
                font-weight: 600;
              }

              .items-toolbar {
                align-items: flex-end;
                gap: 12px;
              }

              .controls-wrap {
                flex-wrap: wrap;
                justify-content: flex-end;
                row-gap: 8px;
              }

              .chip-group {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
              }

              .chip {
                height: 28px;
                padding: 0 10px;
                border-radius: 999px;
                border: 1px solid rgba(255,255,255,0.08);
                background: #1a1f29;
                color: #8b92a0;
                font-size: 10px;
                font-weight: 700;
                font-family: 'Geogrotesque Wide', sans-serif;
                cursor: pointer;
              }

              .chip.active {
                border-color: rgba(31,214,95,0.35);
                color: #1fd65f;
                background: rgba(31,214,95,0.08);
              }

              .catalog-search {
                width: 240px;
                height: 28px;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 6px;
                background: #1a1f29;
                color: #c3cad6;
                padding: 0 10px;
                font-size: 11px;
                font-weight: 600;
                font-family: 'Geogrotesque Wide', sans-serif;
              }

              .catalog-search::placeholder {
                color: #6b7280;
              }

              .catalog-metrics {
                margin-top: 10px;
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 8px;
              }

              .catalog-metrics div {
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.06);
                background: #151925;
                padding: 8px 10px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
              }

              .catalog-metrics span {
                color: #8b92a0;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
              }

              .catalog-metrics strong {
                color: #c3cad6;
                font-size: 12px;
                font-weight: 800;
              }

              .builder-grid {
                margin-top: 10px;
                display: grid;
                grid-template-columns: minmax(0, 1.45fr) minmax(260px, 0.85fr);
                gap: 10px;
              }

              .card-inner {
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 8px;
                background: #151925;
                padding: 10px;
              }

              .catalog-panel {
                display: flex;
                flex-direction: column;
                min-height: 320px;
              }

              .catalog-head {
                margin-bottom: 8px;
              }

              .catalog-toolbar {
                display: flex;
                justify-content: space-between;
                gap: 10px;
                align-items: center;
                margin-bottom: 10px;
                flex-wrap: wrap;
              }

              .catalog-selects {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
              }

              .catalog-selects select {
                height: 28px;
                min-width: 118px;
                max-width: 180px;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 6px;
                background: #1a1f29;
                color: #aeb6c5;
                padding: 0 8px;
                outline: none;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 10px;
                font-weight: 800;
              }

              .catalog-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                gap: 8px;
                max-height: 460px;
                overflow: auto;
                padding-right: 2px;
              }

              .catalog-empty,
              .empty-editor-state {
                border: 1px dashed rgba(255,255,255,0.12);
                border-radius: 8px;
                background: #1a1f29;
                color: #8b92a0;
                min-height: 120px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 6px;
                text-align: center;
                padding: 16px;
                font-size: 12px;
                font-weight: 700;
              }

              .catalog-empty {
                grid-column: 1 / -1;
              }

              .empty-editor-state p {
                color: #c3cad6;
                font-size: 13px;
                font-weight: 800;
              }

              .empty-editor-state span {
                color: #8b92a0;
                font-size: 11px;
                font-weight: 600;
              }

              .catalog-card {
                position: relative;
                appearance: none;
                margin: 0;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 8px;
                background: #1a1f29;
                color: #c3cad6;
                padding: 8px;
                text-align: left;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                gap: 8px;
                font-family: 'Geogrotesque Wide', sans-serif;
                transition: transform .15s, border-color .15s, background .15s;
              }

              .catalog-card:hover:not(:disabled) {
                transform: translateY(-1px);
                border-color: rgba(31,214,95,0.25);
                background: rgba(31,214,95,0.05);
              }

              .catalog-card.selected,
              .catalog-card:disabled {
                opacity: 0.9;
                cursor: default;
                border-color: rgba(31,214,95,0.35);
                box-shadow: inset 0 0 0 1px rgba(31,214,95,0.08);
              }

              .catalog-selected-badge {
                position: absolute;
                top: 8px;
                right: 8px;
                z-index: 2;
                padding: 4px 7px;
                border-radius: 999px;
                background: rgba(31,214,95,0.12);
                border: 1px solid rgba(31,214,95,0.35);
                color: #1fd65f;
                font-size: 9px;
                font-weight: 800;
                letter-spacing: 0.08em;
              }

              .catalog-thumb {
                aspect-ratio: 1;
                border-radius: 8px;
                overflow: hidden;
                background: linear-gradient(180deg, #11141b, #0f131a);
                display: flex;
                align-items: center;
                justify-content: center;
              }

              .catalog-thumb img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
              }

              .catalog-thumb-empty {
                color: #8b92a0;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.08em;
              }

              .catalog-meta {
                display: flex;
                flex-direction: column;
                gap: 2px;
              }

              .catalog-name {
                font-size: 11px;
                font-weight: 700;
                line-height: 1.2;
                color: #c3cad6;
              }

              .catalog-id {
                color: #8b92a0;
                font-size: 10px;
                font-weight: 700;
              }

              .catalog-tags {
                color: #6b7280;
                font-size: 9px;
                font-weight: 800;
                line-height: 1.25;
              }

              .catalog-price {
                color: #1fd65f;
                font-size: 11px;
                font-weight: 700;
              }

              .chance-panel {
                display: flex;
                flex-direction: column;
                gap: 10px;
              }

              .chance-head {
                align-items: baseline;
              }

              .chance-total {
                color: #f6d365;
                font-size: 20px;
                font-weight: 800;
                letter-spacing: 0.02em;
              }

              .chance-summary {
                display: grid;
                gap: 8px;
              }

              .chance-summary div {
                border-radius: 8px;
                background: #1a1f29;
                border: 1px solid rgba(255,255,255,0.06);
                padding: 8px 10px;
                display: flex;
                justify-content: space-between;
                gap: 8px;
                align-items: center;
              }

              .chance-summary span {
                color: #8b92a0;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
              }

              .chance-summary strong {
                color: #c3cad6;
                font-size: 11px;
                font-weight: 700;
                text-align: right;
              }

              .chance-stack {
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-height: 360px;
                overflow: auto;
                padding-right: 2px;
              }

              .chance-row {
                display: flex;
                justify-content: space-between;
                gap: 10px;
                align-items: center;
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 8px;
                background: #1a1f29;
                padding: 8px 10px;
              }

              .chance-row p {
                color: #c3cad6;
                font-size: 11px;
                font-weight: 700;
                line-height: 1.2;
              }

              .chance-row small {
                color: #8b92a0;
                font-size: 10px;
                font-weight: 700;
              }

              .upload-box {
                display: grid;
                grid-template-columns: 84px 1fr;
                gap: 8px;
                align-items: center;
              }

              .upload-preview {
                width: 84px;
                height: 54px;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 6px;
                overflow: hidden;
                background: #0f131a;
              }

              .upload-preview img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
              }

              .upload-empty {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #6b7280;
                font-size: 9px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.08em;
              }

              .upload-dropzone {
                min-height: 54px;
                border: 1px dashed rgba(255,255,255,0.15);
                border-radius: 6px;
                background: #171c26;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 6px 8px;
                text-align: center;
                cursor: pointer;
                transition: border-color .15s, background .15s;
              }

              .upload-dropzone:hover {
                border-color: rgba(31,214,95,0.4);
                background: rgba(31,214,95,0.06);
              }

              .upload-dropzone p {
                color: #8b92a0;
                font-size: 10px;
                font-weight: 700;
                line-height: 1.3;
              }

              .field label {
                color: #6b7280;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.08em;
              }

              input {
                height: 34px;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 6px;
                background: #1a1f29;
                color: #c3cad6;
                padding: 0 10px;
                font-size: 12px;
                font-weight: 600;
                font-family: 'Geogrotesque Wide', sans-serif;
                outline: none;
              }

              input:focus {
                border-color: rgba(31,214,95,0.35);
              }

              .stat-row {
                margin: 12px 0;
                display: flex;
                gap: 20px;
                font-size: 12px;
                color: #8b92a0;
              }

              .stat-row span {
                color: #c3cad6;
                font-weight: 700;
              }

              .editor-status {
                margin: 12px 0;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 8px;
                background: #151925;
                padding: 10px 12px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 14px;
              }

              .editor-status.ready {
                border-color: rgba(31,214,95,0.28);
                background: rgba(31,214,95,0.06);
              }

              .editor-status.needs-work {
                border-color: rgba(246,211,101,0.22);
                background: rgba(246,211,101,0.05);
              }

              .editor-status p {
                color: #c3cad6;
                font-size: 12px;
                font-weight: 800;
                line-height: 1.2;
              }

              .editor-status span {
                color: #8b92a0;
                font-size: 11px;
                font-weight: 600;
              }

              .editor-status strong {
                color: #f6d365;
                font-size: 18px;
                font-weight: 800;
                white-space: nowrap;
              }

              .items-head {
                margin-top: 10px;
              }

              .items-grid {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-top: 10px;
              }

              .item-card-grid {
                margin-top: 8px;
                display: grid;
                grid-template-columns: minmax(230px, 260px) 1fr;
                gap: 10px;
                align-items: start;
              }

              .item-card-media {
                min-width: 0;
              }

              .item-card-fields {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
                align-items: start;
              }

              .item-card-fields > input:nth-child(3),
              .item-card-fields > input:nth-child(4),
              .item-card-fields > .chance-inputs,
              .item-card-fields > .chance-preview {
                grid-column: 1 / -1;
              }

              .chance-inputs {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
              }

              .chance-preview {
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 8px;
                background: #1a1f29;
                padding: 8px 10px;
                display: flex;
                justify-content: space-between;
                gap: 8px;
                align-items: center;
              }

              .chance-preview span {
                color: #8b92a0;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
              }

              .chance-preview strong {
                color: #f6d365;
                font-size: 11px;
                font-weight: 800;
                text-align: right;
              }

              .item-card {
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 8px;
                background: #151925;
                padding: 10px;
              }

              .item-title {
                color: #c3cad6;
                font-size: 11px;
                font-weight: 700;
              }

              .versions {
                margin-top: 14px;
              }

              .version-list {
                margin-top: 8px;
                display: flex;
                flex-direction: column;
                gap: 6px;
                max-height: 180px;
                overflow: auto;
              }

              .version-row {
                display: grid;
                grid-template-columns: 1.1fr 1fr 1fr 1fr 1fr;
                gap: 8px;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 6px;
                background: #1a1f29;
                color: #8b92a0;
                font-size: 11px;
                font-weight: 700;
                padding: 8px;
              }

              .version-row.active {
                border-color: rgba(31,214,95,0.3);
                color: #c3cad6;
              }

              .muted {
                color: #8b92a0;
                font-size: 12px;
                margin-top: 12px;
              }

              @media only screen and (max-width: 1100px) {
                .admin-cases {
                  grid-template-columns: 1fr;
                }

                .form-grid {
                  grid-template-columns: 1fr;
                }

                .version-row {
                  grid-template-columns: 1fr 1fr;
                }
              }

              .cases-heading { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:22px; margin-bottom:18px; border:1px solid #253b30; border-radius:12px; background:radial-gradient(ellipse at top left,#193a27,#111820 65%); }
              .eyebrow { font-size:10px; letter-spacing:.12em; color:#48db7a; font-weight:800; } h1 { margin:5px 0 7px; font-size:26px; color:#f4fff7; } .cases-heading p { color:#94a69b; font-size:12px; } .library-count { text-align:right; display:flex; flex-direction:column; gap:4px; } .library-count strong { font-size:28px; color:#1fd65f; } .library-count span { font-size:11px; color:#a4b4ac; }
              .admin-cases { grid-template-columns:300px minmax(0,1fr); gap:18px; min-width:0; } .card { min-width:0; padding:18px; background:#11171e; border-color:#27313b; }
              .cases-list { position:sticky; top:12px; } .case-items { max-height:650px; overscroll-behavior:contain; } .case-row { align-items:center; padding:10px 8px; flex-shrink:0; background:#171f27; } .case-thumb { width:44px; height:44px; object-fit:contain; flex-shrink:0; } .case-row .left { flex:1; min-width:0; } .case-row .left p { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; } .case-row .left span { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:9px; } .case-row .right { flex-shrink:0; }
              .row { flex-wrap:wrap; } .editor-heading { min-width:0; } .editor-heading h2 { margin:5px 0; font-size:19px; color:#eef9f2; overflow-wrap:anywhere; } .btn { flex-shrink:0; } .btn:disabled { opacity:.4; cursor:not-allowed; } .btn.green.save-case { background:#1fd65f; color:#05240f; } .btn.purple { color:#bdc9bf; border-color:#3b5142; }
              .form-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; margin:20px 0; } .field { min-width:0; } .field input { min-width:0; width:100%; height:40px; background:#0b1117; } .field label { color:#91a297; font-size:10px; }
              .stat-row { display:flex; flex-wrap:wrap; gap:12px; margin:14px 0; } .stat-row p { flex:1; min-width:150px; padding:14px; border:1px solid #28352e; border-radius:8px; background:#17221c; font-size:11px; color:#9eafa4; } .stat-row span { display:block; margin-top:5px; color:#64e18e; font-size:20px; }
              .editor-status { margin-bottom:16px; } .editor-status span { display:block; margin-top:4px; line-height:1.5; } .editor-tabs { display:flex; gap:4px; border-bottom:1px solid #2b353c; margin:22px 0 14px; } .editor-tabs button { display:flex; align-items:center; gap:8px; padding:13px 14px; border:0; border-bottom:2px solid transparent; background:none; color:#8f9eab; cursor:pointer; font:inherit; font-size:12px; font-weight:700; } .editor-tabs button.active { color:#48e480; border-bottom-color:#1fd65f; background:#1fd65f09; } .editor-tabs span { border-radius:4px; padding:2px 5px; background:#22312a; font-size:10px; }
              .drop-controls { display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; } .hidden { display:none!important; } .drop-card { min-width:0; border:1px solid #28343c; border-radius:8px; background:#171e26; overflow:hidden; } .drop-main { display:flex; gap:12px; align-items:center; padding:12px; } .drop-art { width:58px; height:46px; object-fit:contain; flex-shrink:0; } .drop-name { flex:1; min-width:0; } .drop-name strong { display:block; color:#e5edf4; font-size:12px; line-height:1.5; overflow-wrap:anywhere; } .drop-name span { display:block; color:#60d888; font-size:11px; margin-top:4px; }
              .drop-odds { display:flex; gap:8px; flex-shrink:0; } .drop-odds label,.drop-fields label { display:flex; flex-direction:column; gap:5px; color:#8d9da8; font-size:10px; } .drop-odds input { width:86px; height:34px; border:1px solid #34443e; border-radius:5px; background:#0d1517; padding:0 8px; color:#e6fff0; font:inherit; font-size:12px; } .odds-track { height:3px; background:#0d141a; } .odds-track span { height:100%; display:block; background:#1fd65f; }
              .drop-details summary { display:flex; justify-content:space-between; gap:10px; padding:10px 12px; color:#7d8f9b; font-size:10px; cursor:pointer; } .drop-details summary strong { color:#9eb9a8; text-align:right; } .drop-fields { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; padding:12px; border-top:1px solid #2c373e; } .drop-fields input { width:100%; min-width:0; height:36px; background:#0d141b; border:1px solid #303e49; border-radius:5px; padding:0 10px; color:#dbe8ef; } .drop-fields :global(.upload-box) { grid-column:1/-1; }
              .builder-grid { grid-template-columns:minmax(0,1fr); } .chance-panel { display:none; } .items-toolbar { flex-direction:column; align-items:stretch; } .controls-wrap { justify-content:flex-start; } .catalog-search { flex:1; min-width:160px; height:36px; } .catalog-grid { grid-template-columns:repeat(auto-fill,minmax(135px,1fr)); max-height:600px; } .catalog-metrics { grid-template-columns:repeat(2,minmax(0,1fr)); } .catalog-card { min-width:0; } .catalog-selects { width:100%; } .catalog-selects select { min-width:0; flex:1; }
              .case-editor :global(.upload-preview img) { width:100%; height:100%; object-fit:contain; } button:focus-visible,summary:focus-visible { outline:2px solid #1fd65f; outline-offset:2px; }
              @media(max-width:1250px) { .admin-cases { grid-template-columns:minmax(0,1fr); } .cases-list { position:static; } .case-items { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); max-height:250px; } }
              @media(max-width:650px) { .cases-heading { padding:16px; } h1 { font-size:22px; } .library-count span { max-width:80px; } .card { padding:12px; } .case-items,.form-grid { grid-template-columns:minmax(0,1fr); } .drop-main { flex-wrap:wrap; gap:8px; } .drop-name { flex-basis:calc(100% - 75px); } .drop-odds { flex:1; } .drop-odds label { flex:1; } .drop-odds input { width:100%; min-width:0; } .drop-fields { grid-template-columns:minmax(0,1fr); } .editor-tabs button { padding:11px 8px; font-size:11px; } .catalog-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .catalog-selects { flex-wrap:wrap; } .catalog-selects select { flex-basis:40%; max-width:none; } .editor-status { align-items:flex-start; } .editor-status strong { font-size:15px; } .version-row { grid-template-columns:repeat(2,minmax(0,1fr)); } }
            `}</style>
        </>
    );
}

export default AdminCases;
