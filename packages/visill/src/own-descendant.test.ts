import { ownDescendant } from './own-descendant'

describe('ownDescendant', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('returns a direct matching descendant', () => {
    document.body.innerHTML = `
      <div id="root">
        <span class="target" id="onlyTarget"></span>
      </div>
    `
    const root = document.getElementById('root') as HTMLDivElement
    const result = ownDescendant<HTMLSpanElement>(root, '.target')
    expect(result?.id).toBe('onlyTarget')
  })

  it('skips matches owned by a nested instance of root', () => {
    document.body.innerHTML = `
      <div class="unit" id="outer">
        <div class="target" id="outerTarget"></div>
        <div class="unit" id="inner">
          <div class="target" id="innerTarget"></div>
        </div>
      </div>
    `
    const outerUnit = document.getElementById('outer') as HTMLDivElement
    const result = ownDescendant<HTMLDivElement>(outerUnit, '.target')
    expect(result?.id).toBe('outerTarget')
  })

  it('returns undefined when nothing matches', () => {
    document.body.innerHTML = `
      <div id="root">
        <span class="other"></span>
      </div>
    `
    const root = document.getElementById('root') as HTMLDivElement
    const result = ownDescendant(root, '.target')
    expect(result).toBeUndefined()
  })
})
