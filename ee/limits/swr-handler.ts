import { useTeam } from "@/context/team-context";
import useSWR from "swr";
import { z } from "zod";

import { fetcher } from "@/lib/utils";

import { configSchema } from "./server";
import { usePlan } from "@/lib/swr/use-billing";

export type LimitProps = z.infer<typeof configSchema> & {
  usage: {
    documents: number;
    links: number;
    users: number;
  };
  dataroomUpload?: boolean;
};

export function useLimits() {
  const teamInfo = useTeam();
  const { isFree, isTrial } = usePlan();
  const teamId = teamInfo?.currentTeam?.id;

  const { data, error } = useSWR<LimitProps | null>(
    teamId && `/api/teams/${teamId}/limits`,
    fetcher,
    {
      dedupingInterval: 30000,
    },
  );

  const canAddDocuments = data?.documents
    ? data?.usage?.documents < data?.documents
    : true;
  const canAddLinks = data?.links ? data?.usage?.links < data?.links : true;
  const canAddUsers = data?.users ? data?.usage?.users < data?.users : true;
  
  // Check if billing is disabled via environment variable
  // If limits are set to a very large number (999999999), it means billing is disabled
  const UNLIMITED = 999999999;
  const billingDisabled = data?.users === UNLIMITED;
  
  console.log("useLimits data:", data);
  console.log("billingDisabled:", billingDisabled);
  console.log("isFree:", isFree, "isTrial:", isTrial, "canAddUsers:", canAddUsers);
  
  const showUpgradePlanModal = billingDisabled 
    ? false 
    : (isFree && !isTrial) || (isTrial && !canAddUsers);
    
  console.log("showUpgradePlanModal:", showUpgradePlanModal);

  return {
    showUpgradePlanModal,
    limits: data,
    canAddDocuments,
    canAddLinks,
    canAddUsers,
    error,
    loading: !data && !error,
  };
}
