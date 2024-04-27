import { Compiler, Project } from '@algorandfoundation/tealscript'
import algosdk from 'algosdk'

export async function verifyArc23Tealscript(algod: algosdk.Algodv2, tealscriptSource: string, arc23Teal: string): Promise<boolean> {
  // Step One: Create a ts-morph project with an in-memory file system
  const project = new Project({
    // useInMemoryFileSystem must be true in a browser environment
    useInMemoryFileSystem: true,
    // TEALScript requires experimentalDecorators to be enabled
    compilerOptions: { experimentalDecorators: true },
  })

  // Step Two: Add the source to the project
  const srcPath = 'application.ts'
  project.createSourceFile(srcPath, tealscriptSource.replace('@algorandfoundation/tealscript', './src/lib/index'))

  // Step Three: Add TEALScript files to the project
  const libDir = 'src/lib'
  const typesDir = 'types/'

  const indexPath = `${libDir}/index.ts`
  const typesPath = `${typesDir}global.d.ts`
  const contractPath = `${libDir}/contract.ts`
  const lsigPath = `${libDir}/lsig.ts`
  const compilerPath = `${libDir}/compiler.ts`

  const promises = [indexPath, typesPath, contractPath, lsigPath, compilerPath].map(async (p) => {
    // In production you'd probably want to serve these files yourself. They are included in npm package.
    // "src/lib/*.ts" is at "node_modules/@algorandfoundation/tealscript/dist/lib/*.ts"
    // "types/global.d.ts" is at "node_modules/@algorandfoundation/tealscript/types/global.d.ts"
    // If you want to use githubusercontent, just make sure you are using the correct commit/version
    const response = await fetch(
      // @ts-expect-error - TEALSCRIPT_REF is defined in webpack config
      // eslint-disable-next-line no-undef
      `https://raw.githubusercontent.com/algorandfoundation/TEALScript/0.91.1/${p}`,
    )
    const text = await response.text()
    project.createSourceFile(p, text)
  })

  await Promise.all(promises)

  const compilers = await Promise.all(
    Compiler.compileAll({
      srcPath,
      project,
      cwd: '/',
      tealscriptLibDir: libDir,
      tealscriptTypesDir: 'types/',
    }),
  )
  const expectedTeal = arc23Teal.trim().split('\n').slice(0, -1).join('\n')
  const expectedRes = await algod.compile(expectedTeal).do()

  const hashes = await Promise.all(
    compilers.map(async (c) => {
      console.log('HIII')
      const tealscriptTeal = c.teal.approval.map((t) => t.teal).join('\n')

      const { hash } = await algod.compile(tealscriptTeal).do()

      return hash
    }),
  )

  if (hashes.includes(expectedRes.hash)) {
    return true
  }

  return false
}
