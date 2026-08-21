/**
 * Reads an OS drag-and-drop payload into a flat list of files.
 *
 * `DataTransfer.files` is flat: drop a folder and its contents are simply
 * gone. The (non-standard, but supported everywhere this app runs) entries
 * API can walk the real tree, so each file's path is rebuilt and stashed on
 * `webkitRelativePath` — the same field the folder picker fills in. Dropped
 * and picked folders then travel through one code path in `useFileUpload`.
 *
 * Empty folders yield no files and so create no folder, exactly as the
 * folder picker behaves.
 */
export async function filesFromDataTransfer(dt: DataTransfer): Promise<File[]> {
  // Both reads have to happen before the first await — a DataTransfer is
  // emptied the moment the drop handler returns.
  const entries = Array.from(dt.items)
    .filter((item) => item.kind === 'file')
    .map((item) => item.webkitGetAsEntry())
  const flat = Array.from(dt.files)

  // No entries means the browser didn't give us the tree; the flat list is
  // then the best available answer (loose files still work, folders don't).
  if (!entries.some(Boolean)) return flat

  const files: File[] = []
  for (const entry of entries) {
    if (entry) await collect(entry, '', files)
  }
  return files
}

async function collect(entry: FileSystemEntry, parentPath: string, out: File[]) {
  if (entry.isFile) {
    const file = await readFile(entry as FileSystemFileEntry)
    // A top-level file gets a bare name, so it lands in the current folder.
    if (file) out.push(withRelativePath(file, join(parentPath, file.name)))
    return
  }
  const path = join(parentPath, entry.name)
  for (const child of await readDirectory(entry as FileSystemDirectoryEntry)) {
    await collect(child, path, out)
  }
}

const join = (parent: string, name: string) => (parent ? `${parent}/${name}` : name)

function readFile(entry: FileSystemFileEntry) {
  return new Promise<File | null>((resolve) => entry.file(resolve, () => resolve(null)))
}

/** `readEntries()` hands back at most 100 children per call, so keep asking
 *  until it comes back empty. */
function readDirectory(entry: FileSystemDirectoryEntry) {
  const reader = entry.createReader()
  return new Promise<FileSystemEntry[]>((resolve) => {
    const all: FileSystemEntry[] = []
    const next = () =>
      reader.readEntries(
        (batch) => {
          if (batch.length === 0) resolve(all)
          else {
            all.push(...batch)
            next()
          }
        },
        () => resolve(all),
      )
    next()
  })
}

/** `webkitRelativePath` is a readonly getter on `File.prototype`; an own
 *  property shadows it. Least invasive way to make a dropped file look
 *  exactly like a picked one — no wrapper type to thread downstream. */
function withRelativePath(file: File, path: string): File {
  Object.defineProperty(file, 'webkitRelativePath', { value: path, configurable: true })
  return file
}
