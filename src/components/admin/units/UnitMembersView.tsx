import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UnitMembersTable } from "./UnitMembersTable";

interface UnitMembersViewProps {
  unitId: string;
  unitName: string;
}

export default function UnitMembersView({ unitId, unitName }: UnitMembersViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{unitName} Unit</CardTitle>
        <CardDescription>Manage members in the {unitName} unit</CardDescription>
      </CardHeader>
      <CardContent>
        <UnitMembersTable unitId={unitId} unitName={unitName} />
      </CardContent>
    </Card>
  );
}
