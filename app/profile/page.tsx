import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/serverAuth";
import ProfileEditForm from "@/components/ProfileEditForm";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import CancelSubscription from "@/components/CancelSubscription";
import BuyUsage from "@/components/BuyUsage";
import ExchangeCredits from "@/components/ExchangeCredits";

export default async function ProfilePage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-neutral-50 p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h1 className="text-3xl font-bold mb-6">Profil użytkownika</h1>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Imię
              </label>
              <p className="text-lg">{user.name || "Nie podano"}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Email
              </label>
              <p className="text-lg">{user.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Data rejestracji
              </label>
              <p className="text-lg">
                {new Date(user.createdAt).toLocaleDateString("pl-PL")}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Statystyki
              </label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="bg-neutral-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {user._count.missions}
                  </p>
                  <p className="text-sm text-neutral-600">Misje</p>
                </div>
                <div className="bg-neutral-50 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center border border-yellow-100 shadow-sm">
                      <img src="/icons/credit.png" alt="kredyty" className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-700">
                        {user.credits ?? user._count?.credits ?? 0}
                      </p>
                      <p className="text-sm text-neutral-600">Kredyty</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-3">Edytuj dane</h2>
              <ProfileEditForm initialName={user.name ?? ""} initialEmail={user.email ?? ""} />
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">Zmień hasło</h2>
              <ChangePasswordForm />
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">Subskrypcja</h2>
              <CancelSubscription />
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">Wymień kredyty</h2>
              <ExchangeCredits />
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">Zakup użyć</h2>
              <BuyUsage />
            </div>

            <div>
              <a
                href="/"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Powrót do strony głównej
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

