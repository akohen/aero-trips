import { Paper, Button, Group } from "@mantine/core";
import { Link, useNavigate } from "react-router";
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
  const navigate = useNavigate();
  const hasImage = Boolean(imgUrl);
  const shade = shadeBottom
    ? 'linear-gradient(rgba(0,0,0,0.6) 0%, transparent 35%, transparent 40%, rgba(0,0,0,0.85) 100%)'
    : 'linear-gradient(rgba(0,0,0,0.6) 0%, transparent 70%)';

  // The card is not an <a>: its actions hold links of their own, and <a> cannot nest. The title is the real link;
  // a click elsewhere on the card navigates too, unless it lands on a control or comes from a portal (popovers).
  const onCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as Element;
    if (!link || !e.currentTarget.contains(target) || target.closest('a, button, input, label, [role="button"]')) return;
    if (e.metaKey || e.ctrlKey) window.open(link, '_blank');
    else navigate(link);
  };

  return (
    <Paper
      shadow="sm"
      radius="md"
      p="xs"
      h={200}
      onClick={onCardClick}
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
        <Button component={Link} to={link} variant={hasImage ? 'white' : 'default'} size="xs" radius="md">
          {shortener(cardConfig.title(item, itemKey), 40)}
        </Button>
        {cardConfig.icons && (
          <Group gap="xs" mt={4}>
            {cardConfig.icons(item, itemKey, hasImage)}
          </Group>
        )}
      </div>

      <Group justify="space-between" align="flex-end">
        <div style={{ minWidth: 0, flex: 1, ...(hasImage ? { color: 'white' } : {}) }}>
          {cardConfig.content?.(item, itemKey)}
        </div>
        <Group>
          {cardConfig.actions?.(item, itemKey)}
        </Group>
      </Group>
    </Paper>
  );
}

export default CardListItem
