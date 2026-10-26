import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Body, Button, Card, ErrorNotice, Field, Page, Title } from "./ui";
import { useWorkspace } from "./context";
export function SettingsScreen() {
  const { api, logout } = useWorkspace();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const change = useMutation({
    mutationFn: () =>
      api("/auth/change-password", {
        method: "POST",
        body: { current_password: current, password },
      }),
    onSuccess: () => {
      setCurrent("");
      setPassword("");
      setSaved(true);
    },
  });
  const leave = useMutation({ mutationFn: logout });
  return (
    <Page>
      <Title
        eyebrow="YOUR WORKSPACE"
        title="Settings"
        subtitle="Keep your workspace yours."
      />
      <Card>
        <Body>Change password</Body>
        <Field
          label="Current password"
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          autoComplete="current-password"
        />
        <Field
          label="New password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setSaved(false);
          }}
          secureTextEntry
          autoComplete="new-password"
        />
        <Body muted>
          At least 8 characters. Changing it logs out your other devices.
        </Body>
        <ErrorNotice error={change.error} />
        {saved && <Body>Password changed.</Body>}
        <Button
          disabled={change.isPending || !current || password.length < 8}
          onPress={() => change.mutate()}
        >
          Change password
        </Button>
      </Card>
      <Card>
        <Body>Done for now?</Body>
        <ErrorNotice error={leave.error} />
        <Button
          secondary
          disabled={leave.isPending}
          onPress={() => leave.mutate()}
        >
          Log out
        </Button>
      </Card>
    </Page>
  );
}
