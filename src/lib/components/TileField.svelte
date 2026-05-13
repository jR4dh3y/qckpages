<script lang="ts">
	let innerWidth = $state(1600);
	let innerHeight = $state(900);

	const palette = ['#ffe15a', '#4f8cff', '#2c6e63', '#d45c2c', '#ff8fb3', '#9b7cff'];

	let tileSize = $derived(innerWidth < 640 ? 40 : 52);
	let columns = $derived(Math.ceil(innerWidth / tileSize) + 1);
	let rows = $derived(Math.ceil(innerHeight / tileSize) + 1);
	let tiles = $derived.by(() =>
		Array.from({ length: columns * rows }, (_, index) => ({
			id: index,
			color: palette[(index * 5 + Math.floor(index / columns) * 3) % palette.length]
		}))
	);
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<div
	class="tile-field"
	aria-hidden="true"
	style:--columns={columns}
	style:--tile-size={`${tileSize}px`}
>
	{#each tiles as tile (tile.id)}
		<span class="tile" style:--tile-color={tile.color}></span>
	{/each}
</div>

<style>
	.tile-field {
		position: fixed;
		inset: 0;
		z-index: 0;
		display: grid;
		grid-template-columns: repeat(var(--columns), var(--tile-size));
		grid-auto-rows: var(--tile-size);
		background: var(--paper);
		overflow: hidden;
		pointer-events: auto;
	}

	.tile {
		position: relative;
		border-right: 1px solid color-mix(in srgb, var(--ink) 9%, transparent);
		border-bottom: 1px solid color-mix(in srgb, var(--ink) 9%, transparent);
		background: transparent;
		transition:
			background-color 160ms ease,
			box-shadow 160ms ease,
			transform 160ms ease;
	}

	.tile::after {
		content: '';
		position: absolute;
		inset: 8px;
		border: 2px solid transparent;
		background: transparent;
		transition:
			background-color 160ms ease,
			border-color 160ms ease,
			transform 160ms ease;
	}

	.tile:hover {
		z-index: 1;
		background: var(--tile-color);
		box-shadow: 4px 4px 0 var(--ink);
		transform: translate(-1px, -1px);
	}

	.tile:hover::after {
		border-color: var(--ink);
		background: rgba(255, 255, 255, 0.18);
		transform: rotate(4deg);
	}
</style>
