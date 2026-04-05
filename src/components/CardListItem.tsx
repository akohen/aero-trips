import { Paper, Button, Group } from "@mantine/core";
import { useState } from "react";
import { Link } from "react-router-dom";
import { getResizedUrl } from "../utils/image";
import { shortener } from "../utils/utils";
import { CardConfig } from "./CardList";

function CardListItem<T>({
  item, imgUrl, link, cardConfig, itemKey,
}: {
  item: T,
  imgUrl: string | undefined,
  link: string,
  cardConfig: CardConfig<T>,
  itemKey: string,
}) {
  const [currentImgUrl, setCurrentImgUrl] = useState(imgUrl);
  const hasImage = Boolean(currentImgUrl);

  return (
    <Paper
      shadow="sm"
      radius="md"
      p="xs"
      h={200}
      component={Link}
      to={link}
      style={{
        ...(hasImage ? {
          backgroundImage: `url(${currentImgUrl}), linear-gradient(rgba(0,0,0,0.6) 0%, transparent 70%)`,
          backgroundBlendMode: 'multiply',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : {}),
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: link ? 'pointer' : undefined,
      }}
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

      <div>
        <Button variant={hasImage ? 'white' : 'default'} size="xs" radius="md" style={{ pointerEvents: 'none' }}>
          {shortener(cardConfig.title(item, itemKey), 40)}
        </Button>
        {cardConfig.icons && (
          <Group gap="xs" mt={4}>
            {cardConfig.icons(item, itemKey, hasImage)}
          </Group>
        )}
      </div>

      <Group justify="space-between" align="flex-end">
        <div style={hasImage ? { color: 'white' } : undefined} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          {cardConfig.content?.(item, itemKey)}
        </div>
        <Group onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          {cardConfig.actions?.(item, itemKey)}
        </Group>
      </Group>
    </Paper>
  );
}

export default CardListItem
