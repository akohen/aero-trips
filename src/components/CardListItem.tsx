import { Paper, Button, Stack, Group } from "@mantine/core";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getResizedUrl } from "../utils/image";
import { CardColumn } from "./CardList";

function CardListItem<T>({
  item, imgUrl, link, namedColumns, actionColumns,
}: {
  item: T,
  imgUrl: string | undefined,
  link: string,
  namedColumns: CardColumn<T>[],
  actionColumns: CardColumn<T>[],
  itemKey: string,
}) {
  const navigate = useNavigate();
  const [currentImgUrl, setCurrentImgUrl] = useState(imgUrl);
  const hasImage = Boolean(currentImgUrl);

  return (
    <Paper
      shadow="sm"
      radius="md"
      p="xs"
      h={200}
      style={{
        ...(hasImage ? {
          backgroundImage: `url(${currentImgUrl}), linear-gradient(transparent 30%, rgba(0,0,0,0.6) 100%)`,
          backgroundBlendMode: 'multiply',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : {}),
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: link ? 'pointer' : undefined,
      }}
      onClick={link ? () => navigate(link) : undefined}
    >
      {imgUrl && (
        <img
          src={currentImgUrl}
          style={{ display: 'none' }}
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.dataset.fallbackAttempted) {
              img.dataset.fallbackAttempted = 'true';
              setCurrentImgUrl(getResizedUrl(imgUrl));
            }
          }}
        />
      )}
      {namedColumns[0] && (
        <div className={hasImage ? 'card-with-image' : ''}>
          <Button variant={hasImage ? 'white' : 'default'} size="xs" radius="md" style={{ pointerEvents: 'none' }}>
            {namedColumns[0].row(item)}
          </Button>
        </div>
      )}
      <Stack gap="4px" style={{ width: '100%' }}>
        {namedColumns.slice(1).map((col, i) => (
          <div key={i} className={hasImage ? 'card-with-image' : ''} style={hasImage ? { color: 'white' } : {}}>
            {col.row(item)}
          </div>
        ))}
        {actionColumns.length > 0 && (
          <Group justify="flex-end" onClick={(e) => e.stopPropagation()}>
            {actionColumns.map((col, i) => (
              <span key={i}>{col.row(item)}</span>
            ))}
          </Group>
        )}
      </Stack>
    </Paper>
  );
}

export default CardListItem