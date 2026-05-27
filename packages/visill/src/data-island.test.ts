import { readDataIsland } from './data-island'

describe('readDataIsland', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  test('parses JSON content from a script tag matched by id', () => {
    const island = document.createElement('script')
    island.id = 'data'
    island.type = 'application/json'
    island.textContent = '{"foo":1}'
    document.body.appendChild(island)

    const parsed = readDataIsland<{ foo: number }>('data')
    expect(parsed).toEqual({ foo: 1 })
  })

  test('throws when no element with the given id exists', () => {
    expect(() => readDataIsland('missing')).toThrow(Error)
    expect(() => readDataIsland('missing')).toThrow('missing')
  })

  test('throws a clear message identifying the empty island when textContent is empty', () => {
    const island = document.createElement('script')
    island.id = 'data'
    island.type = 'application/json'
    document.body.appendChild(island)

    expect(() => readDataIsland('data')).toThrow(Error)
    expect(() => readDataIsland('data')).toThrow('empty')
    expect(() => readDataIsland('data')).toThrow('data')
  })
})
