import { createResource, createSignal, For, Show } from 'solid-js';
import { authedAPI, createNotification } from '../../util/api';
import Loader from '../Loader/loader';
import AdminMFA from '../MFA/adminmfa';

const EMPTY_SLIDE = {
  id: null,
  title: '',
  subtitle: '',
  cta: '',
  href: '',
  tag: '',
  accentColor: '#1fd65f',
  image: '',
  backgroundImage: '',
  active: true,
  sortOrder: 0
};

function resolveAsset(path) {
  if (!path || typeof path !== 'string') return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  const base = import.meta.env.VITE_SERVER_URL || '';
  return `${base}${path}`;
}

function ImageUpload(props) {
  let inputRef;

  async function handleFiles(fileList) {
    const file = fileList?.[0];
    if (!file) return;
    await props.onFile(file);
  }

  return (
    <div class='upload-row'>
      <button class='btn sm gray' onClick={() => inputRef?.click()} disabled={props.uploading}>
        {props.uploading ? 'UPLOADING...' : 'UPLOAD'}
      </button>
      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        style={{ display: 'none' }}
        onChange={async (event) => {
          await handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}

function AdminSlides() {
  const [resource, { mutate, refetch }] = createResource(fetchSlides);
  const [slides, setSlides] = createSignal([]);
  const [form, setForm] = createSignal({ ...EMPTY_SLIDE });
  const [saving, setSaving] = createSignal(false);
  const [uploading, setUploading] = createSignal('');

  async function fetchSlides() {
    const res = await authedAPI('/admin/slides', 'GET', null);
    if (res?.error === '2FA_REQUIRED') return mutate({ mfa: true });
    setSlides(res?.data || []);
    return res;
  }

  function resetForm() {
    setForm({ ...EMPTY_SLIDE, sortOrder: slides().length });
  }

  function editSlide(slide) {
    setForm({
      id: slide.id,
      title: slide.title || '',
      subtitle: slide.subtitle || '',
      cta: slide.cta || '',
      href: slide.href || '',
      tag: slide.tag || '',
      accentColor: slide.accentColor || '#1fd65f',
      image: slide.image || '',
      backgroundImage: slide.backgroundImage || '',
      active: !!slide.active,
      sortOrder: slide.sortOrder || 0
    });
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadImage(file, field) {
    setUploading(field);

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await authedAPI('/admin/slides/upload', 'POST', JSON.stringify({
        fileName: file.name,
        dataUrl
      }), true);

      if (res?.success && res.data?.path) {
        setField(field, res.data.path);
        createNotification('success', 'Slide image uploaded.');
      }
    } catch (e) {
      console.error(e);
      createNotification('error', 'Failed to upload slide image.');
    } finally {
      setUploading('');
    }
  }

  function buildPayload() {
    const data = form();
    return {
      title: data.title,
      subtitle: data.subtitle || null,
      cta: data.cta || null,
      href: data.href || null,
      tag: data.tag || null,
      accentColor: data.accentColor || '#1fd65f',
      image: data.image || null,
      backgroundImage: data.backgroundImage || null,
      active: data.active,
      sortOrder: data.sortOrder
    };
  }

  async function saveSlide() {
    if (!form().title.trim()) return createNotification('error', 'Slide title is required.');

    setSaving(true);
    const isEditing = !!form().id;
    const res = await authedAPI(
      isEditing ? `/admin/slides/${form().id}` : '/admin/slides',
      isEditing ? 'PUT' : 'POST',
      JSON.stringify(buildPayload()),
      true
    );
    setSaving(false);

    if (!res?.success) return;
    createNotification('success', isEditing ? 'Slide updated.' : 'Slide created.');
    await refetch();
    editSlide(res.data);
  }

  async function deleteSlide(id) {
    if (!id || !confirm('Delete this slider slide?')) return;
    const res = await authedAPI(`/admin/slides/${id}`, 'DELETE', null, true);
    if (!res?.success) return;
    createNotification('success', 'Slide deleted.');
    resetForm();
    await refetch();
  }

  async function toggleSlide(slide) {
    const res = await authedAPI(`/admin/slides/${slide.id}`, 'PUT', JSON.stringify({ active: !slide.active }), true);
    if (!res?.success) return;
    await refetch();
  }

  return (
    <>
      {resource()?.mfa && <AdminMFA refetch={refetch} />}

      <div class='slides-admin'>
        <div class='slides-list card'>
          <div class='row between'>
            <p class='title'>HOME SLIDER</p>
            <button class='btn gray' onClick={resetForm}>NEW</button>
          </div>

          <Show when={!resource.loading} fallback={<Loader />}>
            <Show when={slides().length} fallback={<p class='muted'>No custom slides yet. The homepage will use fallback slides.</p>}>
              <div class='slide-list-stack'>
                <For each={slides()}>{(slide) => (
                  <button class={`slide-row ${form().id === slide.id ? 'active' : ''}`} onClick={() => editSlide(slide)}>
                    <div>
                      <p>{slide.title}</p>
                      <span>#{slide.id} / order {slide.sortOrder}</span>
                    </div>
                    <strong class={slide.active ? 'green-text' : 'muted-text'}>{slide.active ? 'ON' : 'OFF'}</strong>
                  </button>
                )}</For>
              </div>
            </Show>
          </Show>
        </div>

        <div class='slide-editor card'>
          <div class='row between'>
            <p class='title'>{form().id ? 'EDIT SLIDE' : 'CREATE SLIDE'}</p>
            <div class='row'>
              <button class='btn green' disabled={saving()} onClick={saveSlide}>{saving() ? 'SAVING...' : 'SAVE'}</button>
              <Show when={form().id}>
                <button class='btn purple' onClick={() => toggleSlide(form())}>{form().active ? 'DISABLE' : 'ENABLE'}</button>
                <button class='btn red' onClick={() => deleteSlide(form().id)}>DELETE</button>
              </Show>
            </div>
          </div>

          <div class='preview-wrap'>
            <div
              class='slide-preview'
              style={form().backgroundImage ? { 'background-image': `linear-gradient(125deg, rgba(11,15,22,0.86), rgba(17,22,32,0.76), rgba(13,26,18,0.86)), url(${resolveAsset(form().backgroundImage)})` } : {}}
            >
              <div class='preview-content'>
                <Show when={form().tag}><div class='preview-tag' style={{ color: form().accentColor, borderColor: `${form().accentColor}55`, background: `${form().accentColor}1a` }}>{form().tag}</div></Show>
                <h1>{form().title || 'Slider Title'}</h1>
                <p>{form().subtitle || 'Slider subtitle text'}</p>
                <Show when={form().cta}><div class='preview-cta' style={{ background: form().accentColor }}>{form().cta}</div></Show>
              </div>
              <Show when={form().image}>
                <img class='preview-image' src={resolveAsset(form().image)} alt='slide visual' />
              </Show>
            </div>
          </div>

          <div class='form-grid'>
            <div class='field'>
              <label>TITLE</label>
              <input value={form().title} onInput={(e) => setField('title', e.target.value)} placeholder='DEPOSIT MATCH BONUSES' />
            </div>
            <div class='field'>
              <label>SUBTITLE</label>
              <input value={form().subtitle} onInput={(e) => setField('subtitle', e.target.value)} placeholder='FOR NEW AND EXISTING USERS' />
            </div>
            <div class='field'>
              <label>CTA TEXT</label>
              <input value={form().cta} onInput={(e) => setField('cta', e.target.value)} placeholder='DEPOSIT NOW' />
            </div>
            <div class='field'>
              <label>LINK</label>
              <input value={form().href} onInput={(e) => setField('href', e.target.value)} placeholder='/deposit or https://...' />
            </div>
            <div class='field'>
              <label>TAG</label>
              <input value={form().tag} onInput={(e) => setField('tag', e.target.value)} placeholder='LIMITED OFFER' />
            </div>
            <div class='field'>
              <label>ACCENT COLOR</label>
              <div class='color-row'>
                <input type='color' value={form().accentColor} onInput={(e) => setField('accentColor', e.target.value)} />
                <input value={form().accentColor} onInput={(e) => setField('accentColor', e.target.value)} placeholder='#1fd65f' />
              </div>
            </div>
            <div class='field'>
              <label>FOREGROUND IMAGE</label>
              <input value={form().image} onInput={(e) => setField('image', e.target.value)} placeholder='/public/slides/image.png' />
              <ImageUpload uploading={uploading() === 'image'} onFile={(file) => uploadImage(file, 'image')} />
            </div>
            <div class='field'>
              <label>BACKGROUND IMAGE</label>
              <input value={form().backgroundImage} onInput={(e) => setField('backgroundImage', e.target.value)} placeholder='/public/slides/background.png' />
              <ImageUpload uploading={uploading() === 'backgroundImage'} onFile={(file) => uploadImage(file, 'backgroundImage')} />
            </div>
            <div class='field'>
              <label>SORT ORDER</label>
              <input type='number' value={form().sortOrder} onInput={(e) => setField('sortOrder', e.target.value)} placeholder='0' />
            </div>
            <label class='toggle-field'>
              <input type='checkbox' checked={form().active} onChange={(e) => setField('active', e.target.checked)} />
              <span>Active on homepage</span>
            </label>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slides-admin {
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 16px;
          align-items: start;
        }

        .card {
          background: #12151c;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          padding: 16px;
        }

        .row { display: flex; gap: 8px; align-items: center; }
        .between { justify-content: space-between; }
        .title { color: #c3cad6; font-size: 12px; letter-spacing: 0.08em; font-weight: 800; }
        .muted { color: #8b92a0; font-size: 12px; margin-top: 12px; }

        .btn {
          border: 1px solid rgba(255,255,255,0.08);
          background: #1a1f29;
          color: #c3cad6;
          height: 34px;
          padding: 0 12px;
          border-radius: 6px;
          font-weight: 800;
          font-size: 11px;
          cursor: pointer;
          font-family: 'Geogrotesque Wide', sans-serif;
        }

        .btn.sm { height: 28px; font-size: 10px; }
        .btn.green { border-color: rgba(31,214,95,0.35); color: #1fd65f; }
        .btn.purple { border-color: rgba(132,126,193,0.35); color: #837ec1; }
        .btn.red { border-color: rgba(231,76,60,0.35); color: #e74c3c; }
        .btn.gray { color: #8b92a0; }

        .slide-list-stack {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 70vh;
          overflow: auto;
        }

        .slide-row {
          appearance: none;
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
          font-family: 'Geogrotesque Wide', sans-serif;
        }

        .slide-row.active {
          border-color: rgba(31,214,95,0.35);
          background: rgba(31,214,95,0.07);
        }

        .slide-row p { font-size: 12px; font-weight: 800; line-height: 1.2; }
        .slide-row span { color: #8b92a0; font-size: 10px; font-weight: 700; }
        .green-text { color: #1fd65f; font-size: 11px; }
        .muted-text { color: #6b7280; font-size: 11px; }

        .preview-wrap { margin: 14px 0; }
        .slide-preview {
          position: relative;
          min-height: 230px;
          border: 1px solid rgba(31,214,95,0.12);
          border-radius: 12px;
          overflow: hidden;
          background: linear-gradient(125deg, #0b0f16 0%, #111620 50%, #0d1a12 100%);
          background-size: cover;
          background-position: center;
          display: flex;
          align-items: center;
        }

        .slide-preview:before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(31,214,95,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(31,214,95,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .preview-content {
          position: relative;
          z-index: 2;
          max-width: 58%;
          padding: 0 38px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .preview-tag {
          width: fit-content;
          padding: 4px 10px;
          border: 1px solid rgba(31,214,95,0.3);
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .preview-content h1 {
          color: #fff;
          font-size: 30px;
          font-weight: 900;
          line-height: 1.05;
        }

        .preview-content p { color: #8b92a0; font-size: 13px; font-weight: 700; }
        .preview-cta { width: fit-content; color: #fff; border-radius: 8px; padding: 10px 18px; font-size: 12px; font-weight: 900; }

        .preview-image {
          position: absolute;
          z-index: 1;
          right: 36px;
          top: 50%;
          transform: translateY(-50%);
          max-width: 270px;
          max-height: 190px;
          object-fit: contain;
          filter: drop-shadow(0 20px 34px rgba(0,0,0,0.5));
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .field { display: flex; flex-direction: column; gap: 6px; }
        .field label, .toggle-field span { color: #6b7280; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; }

        input {
          height: 34px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 6px;
          background: #1a1f29;
          color: #c3cad6;
          padding: 0 10px;
          font-size: 12px;
          font-weight: 700;
          font-family: 'Geogrotesque Wide', sans-serif;
          outline: none;
        }

        input[type='color'] { padding: 2px; width: 46px; }
        .color-row { display: grid; grid-template-columns: 46px 1fr; gap: 8px; }
        .upload-row { display: flex; }

        .toggle-field {
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          background: #151925;
          min-height: 34px;
          padding: 0 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .toggle-field input { width: 16px; height: 16px; }

        @media only screen and (max-width: 1100px) {
          .slides-admin { grid-template-columns: 1fr; }
          .form-grid { grid-template-columns: 1fr; }
          .preview-image { display: none; }
          .preview-content { max-width: 100%; padding: 0 24px; }
        }
      `}</style>
    </>
  );
}

export default AdminSlides;
