import _glob from 'glob'

const glob = (pattern: string, options?: _glob.IOptions): Promise<Array<string>> =>
  new Promise((resolve, reject) => {
    _glob(pattern, options ?? {}, (err, files) => (err === null ? resolve(files) : reject(err)))
  })

export default glob
