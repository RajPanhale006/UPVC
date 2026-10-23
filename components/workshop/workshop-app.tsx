"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CompanySettingsTab } from "@/components/settings/company-settings-tab";
import { EstimateModuleScreen } from "@/components/estimate/estimate-module-screen";
import { SimpleQuoteScreen } from "@/components/simple-quote/simple-quote-screen";
import { MaterialDetailsScreen } from "@/components/material-details/material-details-screen";
import { MobileDashboard } from "@/components/dashboard/mobile-dashboard";
import type { DashboardActionId } from "@/components/dashboard/dashboard-config";
import { isNativeApp } from "@/lib/capacitor/platform";
import {
  canAccessAppTab,
  dashboardActionToTab,
  isHomeModuleAction,
} from "@/lib/dashboard/module-access";
import { useOnlineStatus } from "@/components/dashboard/dashboard-utils";
import { EstimationTab } from "@/components/estimation/estimation-tab";
import { JobActivityTab } from "@/components/jobs/job-activity-tab";
import { JobDocumentsTab } from "@/components/jobs/job-documents-tab";
import { JobListScreen } from "@/components/jobs/job-list-screen";
import { JobWorkspace } from "@/components/jobs/job-workspace";
import { ModuleSectionRenderer } from "@/components/module-section/module-section-renderer";
import { ProductQuickActions } from "@/components/module-menu/product-quick-actions";
import { QuotationWorkspace } from "@/components/quotation/quotation-workspace";
import { CuttingWorkspace } from "@/components/cutting/cutting-workspace";
import { ProfilesRatesTab } from "@/components/profiles/profiles-rates-tab";
import { PartnerWorkspaceScreen } from "@/components/partner-workspace/partner-workspace-screen";
import { MaterialRequiredTab } from "@/components/material-required/material-required-tab";
import { SummaryTab } from "@/components/summary/summary-tab";
import {
  buildPreviewDataFromEstimation,
  ProductPreview,
} from "@/components/product-preview";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  createDefaultCuttingOptions,
  getDefaultProfileCuttingSettings,
  loadProfileCuttingSettings,
  saveProfileCuttingSettings,
  syncCuttingOptionsForTrack,
  TRACK_SYSTEM_PRESETS,
  type ProfileCuttingSettings,
} from "@/lib/cutting";
import {
  getDefaultEstimationInputs,
  isDoorProduct,
  PRODUCT_KIND_LABELS,
  saveEstimationInputs,
  TRACK_LABELS,
  type EstimationInputs,
} from "@/lib/estimation";
import { createDefaultDoorCuttingOptions, type DoorCuttingOptions } from "@/lib/cutting/door";
import {
  getDefaultQuotationForm,
  loadQuotationForm,
  saveQuotationForm,
  type QuotationForm,
} from "@/lib/quotation";
import {
  getDefaultProfileRateSettings,
  loadProfileRateSettings,
  resetProfileRateSettings,
  saveProfileRateSettings,
  syncMarketRate,
  type ProfileRateSettings,
} from "@/lib/profiles";
import {
  applyActiveProductToState,
  addProductToJob,
  getActiveProduct,
  getCurrentUserName,
  loadOrCreateActiveJob,
  loadJobRegistry,
  normalizeJob,
  saveJob,
  setActiveJobId,
  syncActiveProductToJob,
  type WorkshopJob,
} from "@/lib/jobs";
import { saveQuotationRevision } from "@/lib/quotation/workflow";
import { usesPartnerWorkspace, getCurrentUserRole } from "@/lib/jobs/permissions";
import type { CuttingJobMeta } from "@/lib/summary";
import {
  loadDoorHardwareMasterSettings,
  resetDoorHardwareMasterSettings,
  saveDoorHardwareMasterSettings,
  type DoorHardwareMasterSettings,
} from "@/lib/door-hardware";
import {
  backToModuleMenu,
  closeModuleMenu,
  INITIAL_APP_NAVIGATION,
  MODULE_MENU_TAB,
  navigateFromModuleAction,
  type AppNavigationState,
  type ModuleMenuAction,
  type ModuleMenuId,
} from "@/lib/module-menu";
import { WorkshopShell } from "@/components/workshop/workshop-shell";

export function WorkshopApp() {
  const [job, setJob] = useState<WorkshopJob | null>(null);
  const [profileRates, setProfileRates] = useState<ProfileRateSettings>(
    getDefaultProfileRateSettings,
  );
  const [profileCuttingSettings, setProfileCuttingSettings] =
    useState<ProfileCuttingSettings>(getDefaultProfileCuttingSettings);
  const [doorHardwareMaster, setDoorHardwareMaster] = useState<DoorHardwareMasterSettings>(
    () => loadDoorHardwareMasterSettings(),
  );
  const [estimationInputs, setEstimationInputs] = useState<EstimationInputs>(
    getDefaultEstimationInputs,
  );
  const [quotationForm, setQuotationForm] = useState<QuotationForm>(
    getDefaultQuotationForm,
  );
  const [cuttingOptions, setCuttingOptions] = useState(() =>
    createDefaultCuttingOptions("2-track-t60", "sarik"),
  );
  const [activeTab, setActiveTab] = useState("home");
  const [jobSection, setJobSection] = useState<"overview" | "products" | "documents" | "activity">(
    "overview",
  );
  const [cuttingJobMeta, setCuttingJobMeta] = useState<CuttingJobMeta>({
    jobName: "Window Job",
    jobNotes: "",
    windowLocation: "",
  });
  const [appNav, setAppNav] = useState<AppNavigationState>(INITIAL_APP_NAVIGATION);
  const [showProductQuickActions, setShowProductQuickActions] = useState(false);
  const [openAssistantOnWorkspace, setOpenAssistantOnWorkspace] = useState(false);
  const isOnline = useOnlineStatus();
  const [hydrated, setHydrated] = useState(false);

  const appNavRef = useRef(appNav);
  const activeTabRef = useRef(activeTab);
  /** Skip clearing section nav on the next tab change (module menu / deep link). */
  const preserveSectionNavRef = useRef(false);
  appNavRef.current = appNav;
  activeTabRef.current = activeTab;

  const persistJob = useCallback((nextJob: WorkshopJob) => {
    setJob(nextJob);
    saveJob(nextJob);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- client-only localStorage hydration */
  useEffect(() => {
    const loadedJob = loadOrCreateActiveJob();
    const loadedProfiles = loadProfileRateSettings();
    const loadedCutting = loadProfileCuttingSettings();
    const productState = applyActiveProductToState(loadedJob);

    setJob(loadedJob);
    setProfileRates(loadedProfiles);
    setProfileCuttingSettings(loadedCutting);
    setDoorHardwareMaster(loadDoorHardwareMasterSettings());
    setQuotationForm(loadedJob.quotation ?? loadQuotationForm());
    setEstimationInputs({
      ...productState.estimationInputs,
      profileRatePerKg: loadedProfiles.marketRatePerKg,
    });
    setCuttingOptions(productState.cuttingOptions);
    setCuttingJobMeta(productState.cuttingJobMeta);
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    saveProfileRateSettings(profileRates);
  }, [profileRates, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveEstimationInputs(estimationInputs);
  }, [estimationInputs, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveQuotationForm(quotationForm);
  }, [quotationForm, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveProfileCuttingSettings(profileCuttingSettings);
  }, [profileCuttingSettings, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveDoorHardwareMasterSettings(doorHardwareMaster);
  }, [doorHardwareMaster, hydrated]);

  function syncJobFromWorkspace(
    nextEstimation = estimationInputs,
    nextCutting = cuttingOptions,
    nextMeta = cuttingJobMeta,
    nextQuotation = quotationForm,
  ) {
    if (!job) return;
    let next = syncActiveProductToJob(job, nextEstimation, nextCutting, nextMeta);
    next = saveQuotationRevision(next, nextQuotation);
    persistJob(next);
  }

  function handleQuotationChange(next: QuotationForm) {
    setQuotationForm(next);
    if (!job) return;
    persistJob(saveQuotationRevision({ ...job, quotation: next }, next));
  }

  function handleJobChange(nextJob: WorkshopJob) {
    persistJob(nextJob);
    setQuotationForm(nextJob.quotation);

    const active = getActiveProduct(nextJob);
    if (active && active.id !== getActiveProduct(job ?? nextJob)?.id) {
      const state = applyActiveProductToState(nextJob);
      setEstimationInputs({
        ...state.estimationInputs,
        profileRatePerKg: profileRates.marketRatePerKg,
      });
      setCuttingOptions(state.cuttingOptions);
      setCuttingJobMeta(state.cuttingJobMeta);
    }
  }

  function handleResetProfiles() {
    const defaults = resetProfileRateSettings();
    setProfileRates(defaults);
    setEstimationInputs((current) => ({
      ...current,
      profileRatePerKg: defaults.marketRatePerKg,
    }));
  }

  function handleEstimationChange(next: EstimationInputs) {
    setEstimationInputs(next);
    setProfileRates((current) => syncMarketRate(current, next.profileRatePerKg));
    setCuttingOptions((current) => {
      const syncedCutting = syncCuttingOptionsForTrack(current, next.trackSystemId);
      syncJobFromWorkspace(next, syncedCutting, cuttingJobMeta, quotationForm);
      return syncedCutting;
    });
  }

  function handleProfileRatesChange(next: ProfileRateSettings) {
    setProfileRates(next);
    setEstimationInputs((current) => ({
      ...current,
      profileRatePerKg: next.marketRatePerKg,
    }));
  }

  function handleDoorHardwareMasterChange(next: DoorHardwareMasterSettings) {
    setDoorHardwareMaster(next);
  }

  function handleOpenDoorHardwareRates() {
    preserveSectionNavRef.current = true;
    setAppNav((current) =>
      navigateFromModuleAction(
        "profiles",
        { moduleSection: "hardware" },
        current,
      ),
    );
    setActiveTab("profiles");
  }

  function openModuleSection(
    menuId: ModuleMenuId,
    tab: string,
    params: AppNavigationState["navParams"],
  ) {
    preserveSectionNavRef.current = true;
    setAppNav((current) => navigateFromModuleAction(menuId, params, current));
    applyNavParams(params);
    setShowProductQuickActions(false);
    if (tab === "job") {
      setJobSection("overview");
    }
    if (tab === "documents") {
      setJobSection("documents");
    }
    if (tab === "activity") {
      setJobSection("activity");
    }
    setActiveTab(tab);
  }

  const trackLabel = isDoorProduct(estimationInputs)
    ? PRODUCT_KIND_LABELS.door
    : TRACK_LABELS[estimationInputs.trackSystemId];
  const profileCode = isDoorProduct(estimationInputs)
    ? "P60A-052 / P60A-057"
    : TRACK_SYSTEM_PRESETS[estimationInputs.trackSystemId].profileCode;

  function handleDoorOptionsChange(
    updater: DoorCuttingOptions | ((current: DoorCuttingOptions) => DoorCuttingOptions),
  ) {
    setEstimationInputs((current) => {
      const base =
        current.doorSettings ?? createDefaultDoorCuttingOptions("single");
      const next =
        typeof updater === "function" ? updater(base) : updater;
      return { ...current, doorSettings: next };
    });
  }

  const previewData = useMemo(
    () =>
      buildPreviewDataFromEstimation(
        estimationInputs,
        cuttingOptions,
        profileCode,
      ),
    [estimationInputs, cuttingOptions, profileCode],
  );

  const visualizer = (
    <ProductPreview
      data={previewData}
      variant="sidebar"
      compact
    />
  );

  function handleTabChange(tab: string) {
    let resolvedTab = tab;
    const role = getCurrentUserRole();

    if (!canAccessAppTab(resolvedTab, role)) {
      setActiveTab("home");
      return;
    }

    if (usesPartnerWorkspace() && tab === "summary") {
      resolvedTab = "partner-workspace";
    }

    if (resolvedTab === "home") {
      setAppNav((current) => ({
        ...current,
        moduleMenu: null,
        returnMenu: null,
        navParams: {},
      }));
    } else if (
      resolvedTab !== "job-list" &&
      resolvedTab !== "partner-workspace" &&
      resolvedTab !== "estimate" &&
      resolvedTab !== "quick-quote" &&
      resolvedTab !== "material-details"
    ) {
      if (!preserveSectionNavRef.current) {
        setAppNav((current) => ({
          ...current,
          moduleMenu: null,
          returnMenu: null,
          navParams: {},
        }));
      } else {
        setAppNav((current) => ({
          ...current,
          moduleMenu: null,
        }));
        preserveSectionNavRef.current = false;
      }
    }
    if (resolvedTab === "job") {
      setJobSection("overview");
    }
    if (resolvedTab === "documents") {
      setJobSection("documents");
    }
    if (resolvedTab === "activity") {
      setJobSection("activity");
    }
    setActiveTab(resolvedTab);
  }

  function handleBackToModuleMenu() {
    setAppNav((current) => backToModuleMenu(current));
    setActiveTab("home");
  }

  function handleBackToHome() {
    setAppNav(INITIAL_APP_NAVIGATION);
    setActiveTab("home");
  }

  function handleCloseModuleMenu() {
    setAppNav((current) => closeModuleMenu(current));
  }

  function applyNavParams(params: AppNavigationState["navParams"]) {
    if (params.productKind) {
      setEstimationInputs((current) => ({
        ...current,
        productKind: params.productKind,
      }));
    }
    if (params.jobSection) {
      setJobSection(params.jobSection);
    }
  }

  function handleModuleMenuAction(action: ModuleMenuAction) {
    const menuId = appNav.moduleMenu;
    if (!menuId) return;

    const params: AppNavigationState["navParams"] = {
      moduleSection: action.id,
      ...(action.target.params ?? {}),
    };
    openModuleSection(menuId, action.target.tab, params);
  }

  useEffect(() => {
    let listener: { remove: () => Promise<void> } | undefined;

    void (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { App } = await import("@capacitor/app");
        listener = await App.addListener("backButton", () => {
          const nav = appNavRef.current;
          const tab = activeTabRef.current;

          if (nav.moduleMenu) {
            setAppNav(closeModuleMenu(nav));
            return;
          }
          if (nav.returnMenu && tab !== "home") {
            setAppNav(backToModuleMenu(nav));
            setActiveTab("home");
            return;
          }
          if (tab !== "home") {
            setActiveTab("home");
            return;
          }
          void App.exitApp();
        });
      } catch {
        // Web or plugin unavailable.
      }
    })();

    return () => {
      void listener?.remove();
    };
  }, []);

  function applyJobSelection(nextJob: WorkshopJob) {
    persistJob(nextJob);
    setQuotationForm(nextJob.quotation);
    const state = applyActiveProductToState(nextJob);
    setEstimationInputs({
      ...state.estimationInputs,
      profileRatePerKg: profileRates.marketRatePerKg,
    });
    setCuttingOptions(state.cuttingOptions);
    setCuttingJobMeta(state.cuttingJobMeta);
  }

  function handleContinueJob(jobId: string) {
    const registry = loadJobRegistry();
    const selected = registry.jobs[jobId];
    if (!selected) return;
    setActiveJobId(jobId);
    applyJobSelection(normalizeJob(selected));
  }

  function handleNewProduct(kind: "window" | "door") {
    if (!job) return;
    const nextJob = addProductToJob(job, kind, getCurrentUserName());
    applyJobSelection(nextJob);
    setShowProductQuickActions(true);
    setAppNav(INITIAL_APP_NAVIGATION);
    setActiveTab("calculator");
  }

  function handleDashboardAction(action: DashboardActionId) {
    switch (action) {
      case "new-window":
        handleNewProduct("window");
        return;
      case "new-door":
        handleNewProduct("door");
        return;
      default:
        break;
    }

    if (isHomeModuleAction(action)) {
      const tab = dashboardActionToTab(action);
      if (!tab || !canAccessAppTab(tab, getCurrentUserRole())) return;
      setAppNav(INITIAL_APP_NAVIGATION);
      setOpenAssistantOnWorkspace(false);
      if (action === "documents") {
        setJobSection("documents");
      }
      setActiveTab(tab);
    }
  }

  if (!hydrated || !job) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-6">
        <p className="text-sm font-medium text-slate-700">Loading workshop…</p>
        <p className="text-xs text-slate-500">Restoring your saved job data</p>
      </div>
    );
  }

  const activeProduct = getActiveProduct(job);
  const returnMenu = appNav.returnMenu;
  const documentFilter = appNav.navParams.documentFilter ?? "all";
  const quotationSubTab = appNav.navParams.quotationSubTab;
  const jobStatusFilter = appNav.navParams.jobStatusFilter ?? "all";

  const moduleSection = appNav.navParams.moduleSection;
  const activeSection = moduleSection;

  const sectionShellProps = {
    returnMenu,
    moduleSection,
    jobId: job.id,
    onBackToMenu: handleBackToModuleMenu,
    onBackToHome: handleBackToHome,
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="flex min-h-full flex-col">
      <WorkshopShell
        activeTab={activeTab}
        onTabChange={handleTabChange}
        trackLabel={trackLabel}
        profileCode={profileCode}
        jobName={job.projectName || cuttingJobMeta.jobName}
        jobId={job.id}
        customerName={job.customerName || quotationForm.customerName || undefined}
        visualizer={visualizer}
        onOpenAssistant={() => {
          setOpenAssistantOnWorkspace(true);
          setAppNav(INITIAL_APP_NAVIGATION);
          setActiveTab("partner-workspace");
        }}
      >
        <TabsContent value="home" className="mt-0 outline-none">
          <MobileDashboard
            job={job}
            onAction={handleDashboardAction}
            onContinueJob={(jobId) => {
              handleContinueJob(jobId);
              setActiveTab("job");
            }}
            onOpenSettings={() => setActiveTab("settings")}
            onOpenDocuments={() => {
              setJobSection("documents");
              setActiveTab("documents");
            }}
            onOpenActiveJob={() => {
              setJobSection("overview");
              setActiveTab("job");
            }}
            onOpenAssistant={() => {
              setOpenAssistantOnWorkspace(true);
              setAppNav(INITIAL_APP_NAVIGATION);
              setActiveTab("partner-workspace");
            }}
          />
        </TabsContent>

        <TabsContent value="job-list" className="mt-0 outline-none">
          <JobListScreen
            filter={jobStatusFilter}
            activeJobId={job.id}
            returnMenu={returnMenu ?? "jobs"}
            onSelectJob={(jobId) => {
              handleContinueJob(jobId);
              setActiveTab("job");
            }}
            onBackToMenu={handleBackToModuleMenu}
            onBackToHome={handleBackToHome}
          />
        </TabsContent>

        <TabsContent value="job" className="mt-0 outline-none">
          <ModuleSectionRenderer {...sectionShellProps}>
            <JobWorkspace
              job={job}
              onJobChange={handleJobChange}
              onNavigate={(target) => {
                if (
                  target === "overview" ||
                  target === "products" ||
                  target === "documents" ||
                  target === "activity"
                ) {
                  setJobSection(target);
                  setActiveTab("job");
                } else {
                  setActiveTab(target);
                }
              }}
              section={jobSection}
            />
          </ModuleSectionRenderer>
        </TabsContent>

        <TabsContent value="calculator" className="mt-0 outline-none">
          <ModuleSectionRenderer {...sectionShellProps}>
            <CuttingWorkspace
              activeSection={activeSection}
              estimationInputs={estimationInputs}
              onEstimationInputsChange={handleEstimationChange}
              profileCuttingSettings={profileCuttingSettings}
              cuttingOptions={cuttingOptions}
              onCuttingOptionsChange={(next) => {
                setCuttingOptions((prev) => {
                  const resolved = typeof next === "function" ? next(prev) : next;
                  syncJobFromWorkspace(estimationInputs, resolved, cuttingJobMeta, quotationForm);
                  return resolved;
                });
              }}
              doorOptions={
                estimationInputs.doorSettings ?? createDefaultDoorCuttingOptions("single")
              }
              onDoorOptionsChange={handleDoorOptionsChange}
              cuttingJobMeta={cuttingJobMeta}
              onCuttingJobMetaChange={(next) => {
                setCuttingJobMeta((prev) => {
                  const resolved = typeof next === "function" ? next(prev) : next;
                  syncJobFromWorkspace(estimationInputs, cuttingOptions, resolved, quotationForm);
                  return resolved;
                });
              }}
              footer={
                showProductQuickActions ? (
                  <div className="px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-6">
                    <ProductQuickActions
                      onViewSummary={() => setActiveTab("summary")}
                      onViewCutting={() => setActiveTab("calculator")}
                      onGenerateLabourPdf={() => setActiveTab("summary")}
                      onAddToJob={() => {
                        setJobSection("overview");
                        setActiveTab("job");
                      }}
                      onAddToQuotation={() => setActiveTab("quotation")}
                    />
                  </div>
                ) : undefined
              }
            />
          </ModuleSectionRenderer>
        </TabsContent>

        <TabsContent value="partner-workspace" className="mt-0 outline-none">
          {usesPartnerWorkspace() || !returnMenu ? (
            <PartnerWorkspaceScreen
              job={job}
              estimationInputs={estimationInputs}
              cuttingOptions={cuttingOptions}
              cuttingJobMeta={cuttingJobMeta}
              profileRates={profileRates}
              doorHardwareMaster={doorHardwareMaster}
              quotationForm={quotationForm}
              onEstimationChange={handleEstimationChange}
              onCuttingOptionsChange={(next) => {
                setCuttingOptions((prev) => {
                  const resolved = typeof next === "function" ? next(prev) : next;
                  syncJobFromWorkspace(estimationInputs, resolved, cuttingJobMeta, quotationForm);
                  return resolved;
                });
              }}
              onCuttingJobMetaChange={(next) => {
                setCuttingJobMeta((prev) => {
                  const resolved = typeof next === "function" ? next(prev) : next;
                  syncJobFromWorkspace(estimationInputs, cuttingOptions, resolved, quotationForm);
                  return resolved;
                });
              }}
              onJobChange={handleJobChange}
              onQuotationChange={handleQuotationChange}
              onBack={handleBackToHome}
              backLabel="Back to Home"
              onOpenJob={() => {
                setJobSection("overview");
                setActiveTab("job");
              }}
              onOpenDocuments={() => {
                setAppNav(INITIAL_APP_NAVIGATION);
                setJobSection("documents");
                setActiveTab("documents");
              }}
              onOpenHardwareRates={handleOpenDoorHardwareRates}
              initialAssistantOpen={openAssistantOnWorkspace}
              onAssistantOpenChange={() => setOpenAssistantOnWorkspace(false)}
              onNavigate={(module) => {
                switch (module) {
                  case "home":
                    handleBackToHome();
                    break;
                  case "documents":
                    setAppNav(INITIAL_APP_NAVIGATION);
                    setJobSection("documents");
                    setActiveTab("documents");
                    break;
                  case "job":
                    setJobSection("overview");
                    setActiveTab("job");
                    break;
                  case "cutting-sheet":
                    setActiveTab("calculator");
                    break;
                  case "workshop-cost":
                    setActiveTab("estimation");
                    break;
                  case "quotation":
                    setActiveTab("quotation");
                    break;
                  case "estimate":
                    setActiveTab("estimate");
                    break;
                  case "profiles":
                    setActiveTab("profiles");
                    break;
                  default:
                    handleBackToHome();
                }
              }}
            />
          ) : (
            <ModuleSectionRenderer {...sectionShellProps}>
              <PartnerWorkspaceScreen
                job={job}
                estimationInputs={estimationInputs}
                cuttingOptions={cuttingOptions}
                cuttingJobMeta={cuttingJobMeta}
                profileRates={profileRates}
                doorHardwareMaster={doorHardwareMaster}
                quotationForm={quotationForm}
                onEstimationChange={handleEstimationChange}
                onCuttingOptionsChange={(next) => {
                  setCuttingOptions((prev) => {
                    const resolved = typeof next === "function" ? next(prev) : next;
                    syncJobFromWorkspace(estimationInputs, resolved, cuttingJobMeta, quotationForm);
                    return resolved;
                  });
                }}
                onCuttingJobMetaChange={(next) => {
                  setCuttingJobMeta((prev) => {
                    const resolved = typeof next === "function" ? next(prev) : next;
                    syncJobFromWorkspace(estimationInputs, cuttingOptions, resolved, quotationForm);
                    return resolved;
                  });
                }}
                onJobChange={handleJobChange}
                onQuotationChange={handleQuotationChange}
                onBack={returnMenu ? handleBackToModuleMenu : handleBackToHome}
                onOpenJob={() => {
                  setJobSection("overview");
                  setActiveTab("job");
                }}
                onOpenDocuments={() => {
                  setAppNav((current) => ({
                    ...current,
                    moduleMenu: null,
                    returnMenu: "summary",
                    navParams: { moduleSection: "documents" },
                  }));
                  setJobSection("documents");
                  setActiveTab("documents");
                }}
                onOpenHardwareRates={handleOpenDoorHardwareRates}
                onNavigate={(module) => {
                  switch (module) {
                    case "home":
                      handleBackToHome();
                      break;
                    case "documents":
                      setAppNav((current) => ({
                        ...current,
                        moduleMenu: null,
                        returnMenu: "summary",
                        navParams: { moduleSection: "documents" },
                      }));
                      setJobSection("documents");
                      setActiveTab("documents");
                      break;
                    case "job":
                      setJobSection("overview");
                      setActiveTab("job");
                      break;
                    case "cutting-sheet":
                      setActiveTab("calculator");
                      break;
                    case "workshop-cost":
                      setActiveTab("estimation");
                      break;
                  case "quotation":
                    setActiveTab("quotation");
                    break;
                  case "estimate":
                    setActiveTab("estimate");
                    break;
                  default:
                    handleBackToModuleMenu();
                  }
                }}
              />
            </ModuleSectionRenderer>
          )}
        </TabsContent>

        <TabsContent value="estimate" className="mt-0 outline-none">
          <EstimateModuleScreen
            job={job}
            profileRates={profileRates}
            doorHardwareMaster={doorHardwareMaster}
            quotationForm={quotationForm}
            isOnline={isOnline}
            onBack={handleBackToHome}
            onJobChange={handleJobChange}
            onQuotationChange={handleQuotationChange}
            onOpenQuotation={() => {
              if (isNativeApp()) return;
              setActiveTab("quotation");
            }}
            onSelectProduct={() => setActiveTab("partner-workspace")}
          />
        </TabsContent>

        <TabsContent value="quick-quote" className="mt-0 outline-none">
          <SimpleQuoteScreen
            job={job}
            profileRates={profileRates}
            doorHardwareMaster={doorHardwareMaster}
            quotationForm={quotationForm}
            isOnline={isOnline}
            onBack={handleBackToHome}
            onJobChange={handleJobChange}
            onQuotationChange={handleQuotationChange}
            onProfileRatesChange={handleProfileRatesChange}
            onOpenQuotation={() => {
              if (isNativeApp()) return;
              setActiveTab("quotation");
            }}
            onOpenMaterialDetails={() => setActiveTab("material-details")}
          />
        </TabsContent>

        <TabsContent value="material-details" className="mt-0 outline-none">
          <MaterialDetailsScreen
            job={job}
            profileRates={profileRates}
            doorHardwareMaster={doorHardwareMaster}
            cuttingJobMeta={cuttingJobMeta}
            isOnline={isOnline}
            onBack={handleBackToHome}
          />
        </TabsContent>

        <TabsContent value="material-required" className="mt-0 outline-none">
          <ModuleSectionRenderer {...sectionShellProps}>
            {job ? (
              <MaterialRequiredTab
                job={job}
                profileRates={profileRates}
                doorHardwareMaster={doorHardwareMaster}
              />
            ) : null}
          </ModuleSectionRenderer>
        </TabsContent>

        <TabsContent value="summary" className="mt-0 outline-none">
          <ModuleSectionRenderer {...sectionShellProps}>
            <SummaryTab
              activeSection={activeSection}
              estimationInputs={estimationInputs}
              cuttingOptions={cuttingOptions}
              profileRates={profileRates}
              doorHardwareMaster={doorHardwareMaster}
              cuttingJobMeta={cuttingJobMeta}
              onGoToCutting={() => setActiveTab("calculator")}
              onOpenProfiles={() => setActiveTab("profiles")}
            />
          </ModuleSectionRenderer>
        </TabsContent>

        <TabsContent value="estimation" className="mt-0 outline-none">
          <ModuleSectionRenderer {...sectionShellProps}>
            <EstimationTab
              activeSection={activeSection}
              inputs={estimationInputs}
              profileRates={profileRates}
              doorHardwareMaster={doorHardwareMaster}
              cuttingOptions={cuttingOptions}
              cuttingJobMeta={cuttingJobMeta}
              onOpenDoorHardwareRates={handleOpenDoorHardwareRates}
              onInputsChange={handleEstimationChange}
              onProfileRatesChange={handleProfileRatesChange}
              onDoorHardwareMasterChange={handleDoorHardwareMasterChange}
            />
          </ModuleSectionRenderer>
        </TabsContent>

        <TabsContent value="quotation" className="mt-0 outline-none">
          <ModuleSectionRenderer {...sectionShellProps}>
            <QuotationWorkspace
              activeSection={activeSection}
              form={quotationForm}
              onFormChange={handleQuotationChange}
              activeSubTab={quotationSubTab}
              jobContext={{
                estimationInputs,
                cuttingOptions,
                profileRates,
                cuttingJobMeta,
                job,
                activeProductId: activeProduct?.id,
                onJobChange: handleJobChange,
              }}
            />
          </ModuleSectionRenderer>
        </TabsContent>

        <TabsContent value="documents" className="mt-0 outline-none">
          <ModuleSectionRenderer {...sectionShellProps}>
            <JobDocumentsTab
              activeSection={activeSection}
              job={job}
              onJobChange={handleJobChange}
              initialFilter={documentFilter}
            />
          </ModuleSectionRenderer>
        </TabsContent>

        <TabsContent value="activity" className="mt-0 outline-none">
          <JobActivityTab job={job} />
        </TabsContent>

        <TabsContent value="profiles" className="mt-0 outline-none">
          <ModuleSectionRenderer {...sectionShellProps}>
            <ProfilesRatesTab
              activeSection={activeSection}
              profileRates={profileRates}
              profileCuttingSettings={profileCuttingSettings}
              doorHardwareMaster={doorHardwareMaster}
              estimationInputs={estimationInputs}
              onEstimationInputsChange={setEstimationInputs}
              onChange={handleProfileRatesChange}
              onCuttingSettingsChange={setProfileCuttingSettings}
              onDoorHardwareMasterChange={handleDoorHardwareMasterChange}
              onReset={handleResetProfiles}
              onOpenDoorHardwareRates={handleOpenDoorHardwareRates}
            />
          </ModuleSectionRenderer>
        </TabsContent>

        <TabsContent value="settings" className="mt-0 outline-none">
          <ModuleSectionRenderer {...sectionShellProps}>
            <CompanySettingsTab activeSection={activeSection} />
          </ModuleSectionRenderer>
        </TabsContent>
      </WorkshopShell>
    </Tabs>
  );
}
