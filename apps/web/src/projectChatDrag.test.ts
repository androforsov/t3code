import { describe, expect, it } from "vite-plus/test";
import { EnvironmentId, ProjectId, ThreadId } from "@t3tools/contracts";
import { canPlaceProjectChat } from "./projectChatDrag";
const chat = {
  id: ThreadId.make("chat"),
  title: "Chat",
  projectId: ProjectId.make("project"),
  environmentId: EnvironmentId.make("host"),
};
describe("project chat drop scope", () => {
  it("allows the same project or an empty workspace", () => {
    expect(canPlaceProjectChat(chat, chat)).toBe(true);
    expect(canPlaceProjectChat(chat, null)).toBe(true);
  });
  it("rejects another project, another host, and absent drag data", () => {
    expect(canPlaceProjectChat(chat, { ...chat, projectId: ProjectId.make("other") })).toBe(false);
    expect(canPlaceProjectChat(chat, { ...chat, environmentId: EnvironmentId.make("other") })).toBe(
      false,
    );
    expect(canPlaceProjectChat(null, chat)).toBe(false);
  });
});
