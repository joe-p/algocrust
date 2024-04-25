import { humanFileSize } from '../utils/general'

interface FileTableInterface {
  root: { name: string; cid: string; size: number } | undefined
  uploadedFiles: { name: string; cid: string; size: number }[]
}

const FileTable = ({ uploadedFiles, root }: FileTableInterface) => {
  if (root === undefined || uploadedFiles.length === 0) return <table className="table" />

  return (
    <table className="table">
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Path</th>
          <th scope="col">CID</th>
          <th scope="col">Size</th>
        </tr>
      </thead>
      <tbody>
        <tr key={'/'}>
          <td>/</td>
          <td>{`${root.cid}/`}</td>
          <td>{root.cid}</td>
          <td>{humanFileSize(root.size)}</td>
        </tr>
        {uploadedFiles
          .filter((f) => f.cid !== root.cid)
          .map((file) => (
            <tr key={file.name}>
              <td>{file.name}</td>
              <td>{`${root.cid}/${file.name}`}</td>
              <td>{file.cid}</td>
              <td>{humanFileSize(file.size)}</td>
            </tr>
          ))}
      </tbody>
    </table>
  )
}

export default FileTable
