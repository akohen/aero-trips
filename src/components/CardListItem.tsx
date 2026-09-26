import { Paper, Button, Group } from "@mantine/core";
import { Link } from "react-router";
import { shortener } from "../utils/utils";
import { CardConfig } from "./CardList";

function CardListItem<T>({
  item, imgUrl, link, cardConfig, itemKey, shadeBottom = false,
}: {
  item: T,
  imgUrl: string | undefined,
  link: string,
  cardConfig: CardConfig<T>,
  itemKey: string,
  // Also darken the bottom of the photo, for cards whose `content` holds several lines of text
  shadeBottom?: boolean,
}) {
  const hasImage = Boolean(imgUrl);
  const shade = shadeBottom
    ? 'linear-gradient(rgba(0,0,0,0.6) 0%, transparent 35%, transparent 40%, rgba(0,0,0,0.85) 100%)'
    : 'linear-gradient(rgba(0,0,0,0.6) 0%, transparent 70%)';

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
          backgroundImage: `url(${imgUrl}), ${shade}`,
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
        <div style={{ minWidth: 0, flex: 1, ...(hasImage ? { color: 'white' } : {}) }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
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
