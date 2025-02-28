<script lang="ts">
	import CarbonTrashCan from "~icons/carbon/trash-can";
	import CarbonArrowUpRight from "~icons/carbon/arrow-up-right";

	import { useSettingsStore } from "$lib/stores/settings";
	import Switch from "$lib/components/Switch.svelte";
	import { env as envPublic } from "$env/dynamic/public";
	import { goto } from "$app/navigation";
	import { error } from "$lib/stores/errors";
	import { base } from "$app/paths";

	let settings = useSettingsStore();
</script>

<div class="flex w-full flex-col gap-5">
	<h2 class="text-center text-xl font-semibold text-gray-800 md:text-left">应用配置</h2>
	{#if !!envPublic.PUBLIC_COMMIT_SHA}
		<div class="flex flex-col items-start justify-between text-xl font-semibold text-gray-800">
			<a
				href={`https://github.com/huggingface/chat-ui/commit/${envPublic.PUBLIC_COMMIT_SHA}`}
				target="_blank"
				rel="noreferrer"
				class="text-sm font-light text-gray-500"
			>
				Latest deployment <span class="gap-2 font-mono"
					>{envPublic.PUBLIC_COMMIT_SHA.slice(0, 7)}</span
				>
			</a>
		</div>
	{/if}
	<div class="flex h-full max-w-2xl flex-col gap-2 max-sm:pt-0">
		{#if envPublic.PUBLIC_APP_DATA_SHARING === "1"}
			<label class="flex items-center">
				<Switch
					name="shareConversationsWithModelAuthors"
					bind:checked={$settings.shareConversationsWithModelAuthors}
				/>
				<div class="inline cursor-pointer select-none items-center gap-2 pl-2">
					Share conversations with model authors
				</div>
			</label>

			<p class="text-sm text-gray-500">
				Sharing your data will help improve the training data and make open models better over time.
			</p>
		{/if}
		<label class="mt-6 flex items-center">
			<Switch name="hideEmojiOnSidebar" bind:checked={$settings.hideEmojiOnSidebar} />
			<div class="inline cursor-pointer select-none items-center gap-2 pl-2 font-semibold">
				隐藏对话主题中的表情符号
				<p class="text-sm font-normal text-gray-500">
					表情符号默认显示在侧边栏，启用此功能可隐藏它们
				</p>
			</div>
		</label>

		<label class="mt-6 flex items-center">
			<Switch name="disableStream" bind:checked={$settings.disableStream} />
			<div class="inline cursor-pointer select-none items-center gap-2 pl-2 font-semibold">
				禁用流式
			</div>
		</label>

		<label class="mt-6 flex items-center">
			<Switch name="directPaste" bind:checked={$settings.directPaste} />
			<div class="inline cursor-pointer select-none items-center gap-2 pl-2 font-semibold">
				将文本直接粘贴到聊天中
				<p class="text-sm font-normal text-gray-500">
					默认情况下，将长文本粘贴到聊天中时，我们会将其视为纯文本文件。启用
					此功能可直接粘贴到聊天中。
				</p>
			</div>
		</label>

		<div class="mt-12 flex flex-col gap-3">
			<button
				onclick={async (e) => {
					e.preventDefault();

					confirm("确认删除所有的对话吗?") &&
						(await fetch(`${base}/api/conversations`, {
							method: "DELETE",
						})
							.then(async () => {
								await goto(`${base}/`, { invalidateAll: true });
							})
							.catch((err) => {
								console.error(err);
								$error = err.message;
							}));
				}}
				type="submit"
				class="flex items-center underline decoration-gray-300 underline-offset-2 hover:decoration-gray-700"
				><CarbonTrashCan class="mr-2 inline text-sm text-red-500" />删除所有对话</button
			>
		</div>
	</div>
</div>
