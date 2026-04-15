import { ActionIcon, Center, Group, Pagination, Select, SimpleGrid, Text } from '@mantine/core';
import { IconLayoutList, IconSortAscending, IconSortDescending } from '@tabler/icons-react';
import { useEffect, useState, type JSX } from 'react';
import { useSearchParams } from 'react-router';
import CardListItem from './CardListItem';
import ErrorBoundary from './ErrorBoundary';

function chunk<T>(array: T[], size: number): T[][] {
  if (!array.length) { return []; }
  const head = array.slice(0, size);
  const tail = array.slice(size);
  return [head, ...chunk(tail, size)];
}

export type CardColumn<T> = {
  row: (arg0: T) => JSX.Element,
  title?: string,
  sortFn?: (a: T, b: T) => number,
  linkTo?: (arg0: T, key?: string) => string,
}

export type CardConfig<T> = {
  title: (item: T, key: string) => string,
  icons?: (item: T, key: string, hasImage: boolean) => React.ReactNode,
  content?: (item: T, key: string) => React.ReactNode,
  actions?: (item: T, key: string) => React.ReactNode,
}

function CardList<T>({
  data, columns, defaultSortColumn, defaultSortDir, getImage, onViewChange, cardConfig
}: {
  data: Map<string, T>,
  columns: CardColumn<T>[],
  defaultSortColumn?: number,
  defaultSortDir?: 1 | -1,
  getImage?: (item: T, key: string) => string | undefined,
  onViewChange?: () => void,
  cardConfig: CardConfig<T>,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activePage, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [sortColumn, setSortColumn] = useState<number>(defaultSortColumn !== undefined ? defaultSortColumn : -1);
  const [sortDir, setSortDir] = useState<1 | -1>(defaultSortDir || 1);

  const sortableColumns = columns
    .map((c, i) => ({ ...c, index: i }))
    .filter(c => c.title && c.sortFn);

  const sortedData = sortColumn !== -1 && columns[sortColumn].sortFn !== undefined
    ? [...data].sort((a, b) => sortDir * (columns[sortColumn].sortFn?.(a[1], b[1]) ?? 0))
    : [...data];
  const chunks = chunk(sortedData, 16);

  const updatePage = (page: number) => {
    if (data.size === 0) return;
    const pageId = Math.max(1, Math.min(page, chunks.length));
    setPage(pageId);
    setSearchParams(params => { params.set('page', pageId.toString()); return params; });
  };

  useEffect(() => {
    updatePage(activePage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunks.length]);

  const primaryLinkTo = (item: T, key: string) => {
    for (const col of columns) {
      if (col.linkTo) return col.linkTo(item, key);
    }
    return '';
  };

  const items = chunks.length > 0 ? chunks[activePage - 1] : [];

  return (
    <>
      {(sortableColumns.length > 0 || onViewChange) && (
        <Group mb="sm" justify="space-between">
          <Group>
            {sortableColumns.length > 0 && (
              <>
                <Select
                  placeholder="Trier par…"
                  value={sortColumn !== -1 ? String(sortColumn) : null}
                  onChange={(v) => { setSortColumn(v !== null ? Number(v) : -1); setSortDir(1); }}
                  data={sortableColumns.map(c => ({ value: String(c.index), label: c.title! }))}
                  style={{ width: 220 }}
                  clearable
                />
                {sortColumn !== -1 && (
                  <Text style={{ cursor: 'pointer', display: 'flex' }} onClick={() => setSortDir(d => d === 1 ? -1 : 1)}>
                    {sortDir === 1 ? <IconSortAscending size={20} /> : <IconSortDescending size={20} />}
                  </Text>
                )}
              </>
            )}
          </Group>
          {onViewChange && (
            <ActionIcon variant="subtle" title="Vue liste" onClick={onViewChange} color='black'>
              <IconLayoutList size={16} />
            </ActionIcon>
          )}
        </Group>
      )}

      {items && items.length > 0 ? (
        <SimpleGrid minColWidth="350px" mb="md">
          {items.map(([key, item]) => (
            <ErrorBoundary key={key}>
              <CardListItem
                item={item}
                imgUrl={getImage ? getImage(item, key) : undefined}
                link={primaryLinkTo(item, key)}
                cardConfig={cardConfig}
                itemKey={key}
              />
            </ErrorBoundary>
          ))}
        </SimpleGrid>
      ) : (
        <Text fw={500} ta="center">Aucun résultat</Text>
      )}

      <Center>
        <Pagination total={chunks.length} value={activePage} onChange={updatePage} />
        {data.size > 0 && <Text ml="md">({data.size} résultats)</Text>}
      </Center>
    </>
  );
}



export default CardList;
