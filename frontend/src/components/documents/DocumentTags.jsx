/**
 * ALPHIX V2 — DocumentTags
 * Affiche la liste des tags d'un document sous forme de badges.
 */

import Badge from '../ui/Badge'

/**
 * @param {object} props
 * @param {Array<{id: number|string, name: string}>|null} [props.tags] - Tags API.
 * @returns {import('react').JSX.Element|null}
 */
export default function DocumentTags({ tags }) {
  if (!Array.isArray(tags) || tags.length === 0) return null
  return (
    <ul className="ax-doc-tags" aria-label="Tags du document">
      {tags.map((tag) => (
        <li key={tag.id}>
          <Badge variant="default" size="sm">{tag.name}</Badge>
        </li>
      ))}
    </ul>
  )
}