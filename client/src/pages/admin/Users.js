import React from 'react'
import Layout from '../../components/Layout';
import AdminMenu from '../../components/AdminMenu';
import axios from "axios";
import { useState, useEffect } from 'react';

// Lim Jia Wei, A0277381W

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAllUsers = async () => {

    try {
      const { data } = await axios.get("/api/v1/user/all-users");
      setUsers(data.users);
      setLoading(false);

    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    getAllUsers();
  }, []);

  return (
    <Layout title={"Dashboard - All Users"}>
      <div className="container-fluid m-3 p-3">
        <div className="row">
          <div className="col-md-3">
            <AdminMenu />
          </div>
          <div className="col-md-9">
            <h1>All Users</h1>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <div className="d-flex flex-wrap">
                {users.map((u) => (
                  <div key={u._id} className="text-dark">
                    <div className="card m-2" style={{ width: "18rem" }}>

                      <div className="card-body">
                        <h5 className="card-title mb-1">{u.name}</h5>
                        <p className="card-text text-muted mb-2">{u.email}</p>

                        <div className="d-flex gap-1 flex-wrap">
                          {u.role !== undefined && (
                            <span className={`badge ${u.role === 1 ? "bg-success" : "bg-secondary"}`}>
                              {u.role === 1 ? "Admin" : "User"}
                            </span>
                          )}
                          {u.phone && <span className="badge bg-info">{u.phone}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Users;