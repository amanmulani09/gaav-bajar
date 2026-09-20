import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Session } from "@supabase/supabase-js";
import { configured, supabase } from "../core/supabase/client";
import { localStorage } from "../core/storage/local";
import {
  cleanupUnused,
  deleteRemote,
  finishGoogleLogin,
  isGoogleCallback,
  getFavoriteListings,
  getListing,
  getListingPhotoPaths,
  getListingStatus,
  getListings,
  getMyListings,
  getProfile,
  login,
  rpc,
  saveDraft,
} from "../core/marketplace/repository";
import {
  Draft,
  Language,
  Listing,
  Profile,
  emptyDraft,
  validateDraft,
  whatsappUrl,
} from "../core/marketplace/domain";
import { errorKey, translator } from "../core/i18n";
import { colors, s } from "../shared/ui";
import { styles } from "./styles";
import {
  favoriteIdsStorageKey,
  listingPageSize,
  maxDraftPhotoBytes,
} from "../features/listings/constants";
import { BrowseScreen } from "../features/listings/screens/BrowseScreen";
import { MyListingsScreen } from "../features/listings/screens/MyListingsScreen";
import { ListingEditorScreen } from "../features/listings/screens/ListingEditorScreen";
import { ListingDetailScreen } from "../features/listings/screens/ListingDetailScreen";
import { FavoritesScreen } from "../features/listings/screens/FavoritesScreen";
import {
  parseFavoriteIds,
  toggleFavoriteId,
} from "../features/listings/favorites";
import { LoginCard } from "../features/auth/components/LoginCard";
import { PolicyLinks } from "../features/legal/components/PolicyLinks";
import { ProfileScreen } from "../features/profile/screens/ProfileScreen";
import { LegalScreen } from "../features/legal/screens/LegalScreen";
import { AppHeader } from "./components/AppHeader";
import { BottomNavigation } from "./components/BottomNavigation";
import {
  ActionModal,
  Confirmation,
  ReportReason,
} from "./components/ActionModal";
import { MainTab, Screen } from "./navigation";

export default function App() {
  return (
    <SafeAreaProvider>
      <Market />
    </SafeAreaProvider>
  );
}
function Market() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getString("language");
    return saved === "hi" || saved === "en" ? saved : "mr";
  });
  const t = useMemo(() => translator(language), [language]);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [screen, setScreen] = useState<Screen>("browse");
  const [rows, setRows] = useState<Listing[]>([]);
  const [myRows, setMyRows] = useState<Listing[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    parseFavoriteIds(localStorage.getString(favoriteIdsStorageKey) ?? null),
  );
  const [favoriteRows, setFavoriteRows] = useState<Listing[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [myMore, setMyMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [district, setDistrict] = useState("");
  const [taluka, setTaluka] = useState("");
  const [selected, setSelected] = useState<Listing | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [name, setName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [terms, setTerms] = useState(false);
  const [dataConsent, setDataConsent] = useState(false);
  const [blocks, setBlocks] = useState<{ id: string; name: string }[]>([]);
  const [report, setReport] = useState<{
    target: string;
    kind: "listing" | "seller";
  } | null>(null);
  const [previousScreen, setPreviousScreen] = useState<Screen>("browse");
  const feedRequest = useRef(0);
  const running = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const activeSession = useRef<Session | null>(null);
  function acceptSession(next: Session | null) {
    activeSession.current = next;
    setSession(next);
  }
  const userId = session?.user.id;
  const draftKey = userId ? `draft:${userId}` : "";
  const ready = Boolean(
    session &&
      profile?.terms_at &&
      profile.data_consent_at &&
      !profile.suspended &&
      !profile.deleting,
  );

  const fail = useCallback(
    (error: unknown) => setNotice(translator(language)(errorKey(error))),
    [language],
  );
  async function run(action: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      fail(error);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  const loadFeed = useCallback(
    async (append = false, offset = 0) => {
      if (!configured) return;
      const request = ++feedRequest.current;
      setLoading(true);
      try {
        const data = await getListings(
          { category, district, taluka, search },
          offset,
          listingPageSize,
        );
        if (request === feedRequest.current) {
          setRows((old) =>
            append
              ? [
                  ...old,
                  ...data.filter(
                    (item) => !old.some((existing) => existing.id === item.id),
                  ),
                ]
              : data,
          );
          setHasMore(data.length === listingPageSize);
        }
      } catch (error) {
        if (request === feedRequest.current) fail(error);
      } finally {
        if (request === feedRequest.current) setLoading(false);
      }
    },
    [category, district, taluka, search, userId, fail],
  );
  async function loadMine(append = false, ownerId = userId) {
    if (!ownerId || !configured) return;
    const offset = append ? myRows.length : 0;
    const data = await getMyListings(ownerId, offset, listingPageSize);
    setMyRows((old) =>
      append
        ? [
            ...old,
            ...data.filter(
              (item) => !old.some((existing) => existing.id === item.id),
            ),
          ]
        : data,
    );
    setMyMore(data.length === listingPageSize);
  }
  async function loadProfile() {
    if (!userId) return;
    const profileData = await getProfile(userId);
    if (activeSession.current?.user.id !== userId) return;
    setProfile(profileData);
    setName(
      profileData?.display_name || session?.user.user_metadata.full_name || "",
    );
    setTerms(Boolean(profileData?.terms_at));
    setDataConsent(Boolean(profileData?.data_consent_at));
    if (
      profileData?.terms_at &&
      profileData.data_consent_at &&
      !profileData.suspended &&
      !profileData.deleting
    ) {
      const nextBlocks = await rpc("my_blocks");
      if (activeSession.current?.user.id === userId)
        setBlocks(nextBlocks);
    }
  }
  const loadFavorites = useCallback(async () => {
    if (!configured || !favoriteIds.length) {
      setFavoriteRows([]);
      return;
    }
    setFavoritesLoading(true);
    try {
      setFavoriteRows(await getFavoriteListings(favoriteIds));
    } catch (error) {
      fail(error);
    } finally {
      setFavoritesLoading(false);
    }
  }, [favoriteIds, fail]);
  useEffect(() => {
    if (!configured) return;
    let current = true;
    let authChanged = false;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!current || authChanged) return;
      if (error) fail(error);
      else acceptSession(data.session);
    }).catch((error) => { if (current && !authChanged) fail(error); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      authChanged = true;
      if (current) acceptSession(next);
    });
    const callback = (url: string | null) => {
      if (url && isGoogleCallback(url))
        void finishGoogleLogin(url).catch(fail);
    };
    void Linking.getInitialURL().then(callback).catch(fail);
    const links = Linking.addEventListener("url", ({ url }) => callback(url));
    return () => {
      current = false;
      data.subscription.unsubscribe();
      links.remove();
    };
  }, []);
  useEffect(() => {
    localStorage.set(favoriteIdsStorageKey, JSON.stringify(favoriteIds));
  }, [favoriteIds]);
  useEffect(() => {
    if (screen === "favorites") void loadFavorites();
  }, [screen, loadFavorites]);
  useEffect(() => {
    setProfile(null);
    setName("");
    setTerms(false);
    setDraft(null);
    setMyRows([]);
    setBlocks([]);
    setReferralCode("");
    setDataConsent(false);
    if (userId) void loadProfile().catch(fail);
  }, [userId]);
  useEffect(() => {
    setRows([]);
    void loadFeed();
  }, [loadFeed]);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [screen]);
  useEffect(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (busy) return true;
      if (screen === "privacy" || screen === "terms" || screen === "detail") {
        setScreen(previousScreen);
        return true;
      }
      if (screen !== "browse") {
        setScreen("browse");
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [screen, previousScreen, busy]);

  async function requireGoogle(): Promise<Session | null> {
    if (session) return session;
    if (!configured) throw new Error("setup");
    const next = await login();
    if (!next) return null;
    acceptSession(next);
    return next;
  }
  async function syncProfile(currentSession: Session): Promise<Profile | null> {
    const currentProfile = await getProfile(currentSession.user.id);
    if (activeSession.current?.user.id !== currentSession.user.id) return null;
    setProfile(currentProfile);
    setName(
      currentProfile?.display_name ||
        currentSession.user.user_metadata.full_name ||
        "",
    );
    setTerms(Boolean(currentProfile?.terms_at));
    setDataConsent(Boolean(currentProfile?.data_consent_at));
    return currentProfile;
  }
  async function ensureJoined(currentSession: Session): Promise<boolean> {
    const currentProfile =
      profile?.id === currentSession.user.id
        ? profile
        : await syncProfile(currentSession);
    if (activeSession.current?.user.id !== currentSession.user.id) return false;
    if (
      !currentProfile?.terms_at ||
      !currentProfile.data_consent_at ||
      currentProfile.suspended ||
      currentProfile.deleting
    ) {
      setScreen("profile");
      setNotice(t("profileRequired"));
      return false;
    }
    return true;
  }
  function requireProfile(): boolean {
    if (!configured) {
      setNotice(t("setup"));
      return false;
    }
    if (!ready) {
      setScreen("profile");
      setNotice(t(session ? "profileRequired" : "loginRequired"));
      return false;
    }
    return true;
  }
  function updateDraft(next: Draft) {
    setDraft(next);
    if (draftKey)
      void AsyncStorage.setItem(draftKey, JSON.stringify(next)).catch(fail);
  }
  function patchDraft(update: Partial<Draft>) {
    if (draft) updateDraft({ ...draft, ...update });
  }
  async function startPost() {
    const currentSession = await requireGoogle();
    if (!currentSession) return;
    if (!(await ensureJoined(currentSession))) return;
    const key = `draft:${currentSession.user.id}`;
    const local = await AsyncStorage.getItem(key);
    setDraft(
      local ? (JSON.parse(local) as Draft) : emptyDraft(Crypto.randomUUID()),
    );
    setScreen("post");
  }
  async function openListing(item: Listing) {
    const currentSession = await requireGoogle();
    if (!currentSession) return;
    if (!(await ensureJoined(currentSession))) return;
    const listing = await getListing(item.id);
    if (!listing) throw new Error("notFound");
    setSelected(listing);
    setPreviousScreen(
      screen === "mine" ? "mine" : screen === "favorites" ? "favorites" : "browse",
    );
    setScreen("detail");
  }
  async function toggleFavorite(id: string) {
    const currentSession = await requireGoogle();
    if (!currentSession) return;
    if (!(await ensureJoined(currentSession))) return;
    setFavoriteIds((current) => toggleFavoriteId(current, id));
    setFavoriteRows((current) => current.filter((item) => item.id !== id));
  }
  async function editListing(item: Listing) {
    if (!requireProfile()) return;
    const local = await AsyncStorage.getItem(draftKey);
    if (local) {
      const existing = JSON.parse(local) as Draft;
      if (existing.id !== item.id) {
        setNotice(t("deleteDraftFirst"));
        setDraft(existing);
        setScreen("post");
        return;
      }
      setDraft(existing);
      setScreen("post");
      return;
    }
    const contacts = await rpc("get_contact", { target: item.id });
    updateDraft({
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      price: item.price?.toString() || "",
      district_id: item.district_id || "",
      taluka_id: item.taluka_id || "",
      village: item.village,
      phone: contacts[0]?.phone || "",
      whatsapp: contacts[0]?.whatsapp || "",
      photos: item.listing_photos.map((photo) => ({
        path: photo.path,
        uri: photo.url,
      })),
    });
    setScreen("post");
  }
  async function addPhoto() {
    if (!draft || !userId) return;
    if (draft.photos.length >= 3) throw new Error("photoLimit");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const size =
      asset.width >= asset.height ? { width: 1200 } : { height: 1200 };
    let photo = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: size }],
      {
        compress: 0.65,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      },
    );
    if ((photo.base64?.length || 0) * 0.75 > maxDraftPhotoBytes)
      photo = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 800 } }],
        {
          compress: 0.4,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        },
      );
    if (!photo.base64 || photo.base64.length * 0.75 > maxDraftPhotoBytes)
      throw new Error("photoInvalid");
    updateDraft({
      ...draft,
      photos: [
        ...draft.photos,
        {
          path: `${userId}/${draft.id}/${Crypto.randomUUID()}.jpg`,
          uri: photo.uri,
          base64: photo.base64,
        },
      ],
    });
  }
  async function publish() {
    if (!draft || !requireProfile()) return;
    const validation = validateDraft(draft);
    if (validation) throw new Error(validation);
    await AsyncStorage.setItem(draftKey, JSON.stringify(draft));
    // Remove abandoned uploads before retry; referenced photos cannot be removed by storage policy.
    await cleanupUnused(draft);
    const status = await saveDraft(draft);
    await AsyncStorage.removeItem(draftKey);
    setDraft(null);
    setScreen("mine");
    // A failed refresh must not turn a committed publish into a reported failed save.
    await loadMine().catch(() => undefined);
    await loadFeed();
    setNotice(t(status === "pending" ? "pendingNotice" : "saved"));
  }
  function requestDiscard() {
    if (!draft) return;
    setConfirmation({
      text: t("discardConfirm"),
      action: async () => {
        const status = await getListingStatus(draft.id);
        if (status === "draft") await deleteRemote(draft.id);
        else if (status) {
          const photos = await getListingPhotoPaths(draft.id);
          await cleanupUnused({ ...draft, photos: photos || [] });
        }
        await AsyncStorage.removeItem(draftKey);
        setDraft(null);
        setScreen("mine");
        await loadMine();
      },
    });
  }
  async function contact(channel: "call" | "whatsapp") {
    if (!selected || !requireProfile()) return;
    const rows = await rpc("get_contact", { target: selected.id });
    if (!rows.length) throw new Error("contactUnavailable");
    const contact = rows[0];
    const url =
      channel === "call"
        ? `tel:+${contact.phone}`
        : whatsappUrl(
            contact.whatsapp || contact.phone,
            selected.title,
            selected.id,
            language,
          );
    // HTTPS opens WhatsApp when installed and its website otherwise; phone stays available.
    await Linking.openURL(url).catch(() => {
      throw new Error("externalFailed");
    });
  }
  function requestMarkSold() {
    if (!selected) return;
    setConfirmation({
      text: t("soldConfirm"),
      action: async () => {
        await rpc("mark_sold", { target: selected.id });
        setScreen("mine");
        await loadMine();
        await loadFeed();
      },
    });
  }
  function requestDeleteListing() {
    if (!selected) return;
    setConfirmation({
      text: t("deleteListingConfirm"),
      action: () => removeListing(selected.id),
    });
  }
  function requestReport(kind: "listing" | "seller") {
    if (!selected || !requireProfile()) return;
    setReport({
      target: kind === "listing" ? selected.id : selected.owner_id,
      kind,
    });
  }
  function requestBlock() {
    if (!selected || !requireProfile()) return;
    setConfirmation({
      text: t("blockConfirm"),
      action: async () => {
        await rpc("block_seller", {
          target: selected.owner_id,
          blocked: true,
        });
        setSelected(null);
        setScreen("browse");
        await loadFeed();
      },
    });
  }
  async function removeListing(id: string) {
    await deleteRemote(id);
    const local = await AsyncStorage.getItem(draftKey);
    if (local && (JSON.parse(local) as Draft).id === id) {
      await AsyncStorage.removeItem(draftKey);
      setDraft(null);
    }
    setSelected(null);
    setScreen("mine");
    await loadMine();
    await loadFeed();
  }
  async function signOut() {
    if (draftKey) await AsyncStorage.removeItem(draftKey);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setDraft(null);
    setSelected(null);
    setScreen("browse");
  }
  async function removeAccount() {
    await deleteRemote();
    if (draftKey) await AsyncStorage.removeItem(draftKey);
    await supabase.auth.signOut({ scope: "local" });
    acceptSession(null);
    setScreen("browse");
    setNotice(t("accountDeleted"));
  }
  async function startLogin() {
    const currentSession = await requireGoogle();
    if (!currentSession) return;
    await ensureJoined(currentSession);
  }
  async function saveProfile() {
    await rpc("save_profile", {
      name,
      accept_terms: terms,
      accept_data: dataConsent,
      consent_version: "onboarding-v1",
      consent_language: language,
      referral_code: referralCode.trim() || null,
    });
    setReferralCode("");
    await loadProfile();
    setNotice(t("profileSaved"));
  }
  async function unblock(id: string) {
    await rpc("block_seller", { target: id, blocked: false });
    await loadProfile();
    await loadFeed();
  }
  function requestDeleteAccount() {
    setConfirmation({
      text: t("deleteAccountConfirm"),
      action: removeAccount,
    });
  }
  async function policyHelp() {
    const url = process.env.EXPO_PUBLIC_POLICY_URL;
    if (!url || url.includes("YOUR_")) {
      await Linking.openURL(
        "mailto:zero21studiocompany@gmail.com?subject=Gaav%20Bajar%20support",
      );
      return;
    }
    await Linking.openURL(`${url.replace(/\/$/, "")}/delete-account.html`);
  }
  function openPolicy(target: "privacy" | "terms") {
    setPreviousScreen(screen);
    setScreen(target);
  }
  function nav(target: MainTab) {
    if (target === "browse") {
      setScreen("browse");
      return;
    }
    if (target === "post") {
      void run(startPost);
      return;
    }
    void run(async () => {
      const currentSession = await requireGoogle();
      if (!currentSession) return;
      if (target === "profile") {
        await syncProfile(currentSession);
        if (activeSession.current?.user.id !== currentSession.user.id) return;
        setScreen("profile");
        return;
      }
      if (!(await ensureJoined(currentSession))) return;
      setScreen(target);
      if (target === "mine")
        await loadMine(false, currentSession.user.id);
    });
  }
  const loginCard = <LoginCard t={t} onLogin={() => void run(startLogin)} />;
  const policyLinks = <PolicyLinks t={t} onOpen={openPolicy} />;
  function closeActionModal() {
    setNotice(null);
    setConfirmation(null);
    setReport(null);
  }
  function confirmAction(action: () => Promise<void>) {
    setConfirmation(null);
    void run(action);
  }
  function submitReport(reason: ReportReason) {
    if (!report) return;
    const item = report;
    setReport(null);
    void run(async () => {
      await rpc("report_item", {
        target: item.target,
        kind: item.kind,
        why: reason,
      });
      setNotice(t("reported"));
    });
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.shell}>
        <AppHeader
          t={t}
          language={language}
          onLanguageChange={() => {
            const next = language === "mr" ? "hi" : language === "hi" ? "en" : "mr";
            setLanguage(next);
            localStorage.set("language", next);
          }}
        />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {screen === "browse" ? (
            <BrowseScreen
              t={t}
              rows={rows}
              favoriteIds={favoriteIds}
              loading={loading}
              hasMore={hasMore}
              query={query}
              category={category}
              district={district}
              taluka={taluka}
              search={search}
              setQuery={setQuery}
              setCategory={setCategory}
              setDistrict={setDistrict}
              setTaluka={setTaluka}
              setSearch={setSearch}
              onToggleFavorite={(id) =>
                void run(() => toggleFavorite(id))
              }
              onRefresh={() => void loadFeed()}
              onLoadMore={() => void loadFeed(true, rows.length)}
              onOpen={(item) => void run(() => openListing(item))}
              setupNotice={!configured ? t("setup") : undefined}
            />
          ) : (
            <ScrollView
              ref={scroll}
              style={{ flex: 1 }}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              {!configured && (
                <View style={s.notice}>
                  <Text style={s.body}>{t("setup")}</Text>
                </View>
              )}
            {screen === "favorites" && (
              <FavoritesScreen
                t={t}
                rows={favoriteRows}
                favoriteIds={favoriteIds}
                loading={favoritesLoading}
                onBrowse={() => setScreen("browse")}
                onRefresh={() => void loadFavorites()}
                onOpen={(item) => void run(() => openListing(item))}
                onToggleFavorite={(id) =>
                  void run(() => toggleFavorite(id))
                }
              />
            )}
            {screen === "mine" && (
              <MyListingsScreen
                t={t}
                signedIn={Boolean(session)}
                rows={myRows}
                hasMore={myMore}
                loginCard={loginCard}
                onPost={() => void run(startPost)}
                onRefresh={() => void run(() => loadMine())}
                onLoadMore={() => void run(() => loadMine(true))}
                onOpen={(item) => void run(() => openListing(item))}
              />
            )}
            {screen === "post" && draft && (
              <ListingEditorScreen
                t={t}
                draft={draft}
                policyLinks={policyLinks}
                patchDraft={patchDraft}
                onAddPhoto={() => void run(addPhoto)}
                onPublish={() => void run(publish)}
                onDiscard={requestDiscard}
              />
            )}
            {screen === "detail" && selected && (
              <ListingDetailScreen
                t={t}
                item={selected}
                own={selected.owner_id === userId}
                signedIn={Boolean(session)}
                favorite={favoriteIds.includes(selected.id)}
                onBack={() => setScreen(previousScreen)}
                onEdit={() => void run(() => editListing(selected))}
                onMarkSold={requestMarkSold}
                onDelete={requestDeleteListing}
                onContact={(channel) => void run(() => contact(channel))}
                onReport={requestReport}
                onBlock={requestBlock}
                onToggleFavorite={() =>
                  void run(() => toggleFavorite(selected.id))
                }
              />
            )}
            {screen === "profile" && (
              <ProfileScreen
                t={t}
                email={session?.user.email}
                profile={profile}
                name={name}
                referralCode={referralCode}
                terms={terms}
                dataConsent={dataConsent}
                blocks={blocks}
                loginCard={loginCard}
                policyLinks={policyLinks}
                setName={setName}
                setReferralCode={setReferralCode}
                setTerms={setTerms}
                setDataConsent={setDataConsent}
                onSave={() => void run(saveProfile)}
                onUnblock={(id) => void run(() => unblock(id))}
                onSignOut={() => void run(signOut)}
                onDelete={requestDeleteAccount}
                onHelp={() => void run(policyHelp)}
                onDeclineConsent={() => setScreen("browse")}
              />
            )}
            {(screen === "privacy" || screen === "terms") && (
              <LegalScreen
                t={t}
                language={language}
                page={screen}
                onBack={() => setScreen(previousScreen)}
                onHelp={() => void run(policyHelp)}
              />
            )}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
        <BottomNavigation t={t} screen={screen} onNavigate={nav} />
        {busy && (
          <View style={styles.busy}>
            <View style={s.card}>
              <ActivityIndicator size="large" color={colors.green} />
              <Text style={s.body}>{t("loading")}</Text>
            </View>
          </View>
        )}
        <ActionModal
          t={t}
          notice={notice}
          confirmation={confirmation}
          reporting={Boolean(report)}
          onClose={closeActionModal}
          onConfirm={confirmAction}
          onReport={submitReport}
        />
      </View>
    </SafeAreaView>
  );
}
