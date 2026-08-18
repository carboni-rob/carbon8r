const $ = (id) => document.getElementById(id)
const DEFAULTS = { enabled: true, editor: 'auto', customTemplate: '', root: '' }

function refreshVisibility() {
  const editor = $('editor').value
  $('custom-row').style.display = editor === 'custom' ? 'block' : 'none'
  $('root-row').style.display = editor === 'auto' ? 'none' : 'block'
}

function save() {
  chrome.storage.sync.set({
    enabled: $('enabled').checked,
    editor: $('editor').value,
    customTemplate: $('template').value.trim(),
    root: $('root').value.trim()
  })
  refreshVisibility()
}

chrome.storage.sync.get(DEFAULTS, (settings) => {
  $('enabled').checked = settings.enabled
  $('editor').value = settings.editor
  $('template').value = settings.customTemplate
  $('root').value = settings.root
  refreshVisibility()
})

for (const id of ['enabled', 'editor', 'template', 'root']) {
  $(id).addEventListener('change', save)
}
