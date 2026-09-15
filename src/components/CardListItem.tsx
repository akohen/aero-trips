import { Paper, Button, Group } from "@mantine/core";
import { Link } from "react-router";
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
  const hasImage = Boolean(imgUrl);

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
          backgroundImage: `url(${imgUrl}), linear-gradient(rgba(0,0,0,0.6) 0%, transparent 70%)`,
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
